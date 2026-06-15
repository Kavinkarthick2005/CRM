import random
import json
from datetime import datetime, timezone, timedelta
from db import engine, Base, SessionLocal
from models.models import Customer, Order
from sqlalchemy import func, text

def migrate_orders():
    print("Creating tables (if they don't exist)...")
    Base.metadata.create_all(bind=engine)
    
    # Manually add created_at column to customers if it doesn't exist
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE customers ADD COLUMN created_at TIMESTAMP WITH TIME ZONE;"))
            conn.commit()
            print("Added created_at column to customers.")
    except Exception as e:
        print("Column created_at might already exist:", e)

    db = SessionLocal()
    
    customers = db.query(Customer).all()
    print(f"Found {len(customers)} customers. Seeding historical orders...")
    
    orders_to_create = []
    
    for c in customers:
        # Check if customer already has orders to avoid duplicates
        existing_orders = db.query(func.count(Order.id)).filter(Order.customer_id == c.id).scalar()
        if existing_orders > 0:
            continue
            
        if c.total_orders <= 0:
            continue
            
        avg_order_value = c.total_spend / c.total_orders
        
        # Determine "member_since" date. 
        # The oldest possible order date should be randomly 6 to 24 months ago.
        member_since = datetime.now(timezone.utc) - timedelta(days=random.randint(180, 730))
        
        # We know their last order date:
        last_order_date = c.last_order_at.replace(tzinfo=timezone.utc) if c.last_order_at else datetime.now(timezone.utc)
        
        # If last_order_date is somehow before member_since, adjust member_since
        if last_order_date < member_since:
            member_since = last_order_date - timedelta(days=30)
            
        order_dates = []
        if c.total_orders == 1:
            order_dates = [last_order_date]
        else:
            # Generate random dates between member_since and last_order_date
            time_between = last_order_date - member_since
            for _ in range(c.total_orders - 1):
                random_days = random.random() * time_between.days
                random_date = member_since + timedelta(days=random_days)
                order_dates.append(random_date)
            # Add the exact last order date
            order_dates.append(last_order_date)
            
        order_dates.sort()
        
        # Ensure the total amount matches c.total_spend exactly (or very closely)
        current_sum = 0
        for i, dt in enumerate(order_dates):
            is_last = (i == len(order_dates) - 1)
            
            if is_last:
                amount = max(c.total_spend - current_sum, 10)  # Remainder
            else:
                # Add +/- 20% variance to average
                variance = avg_order_value * 0.2
                amount = int(avg_order_value + random.uniform(-variance, variance))
                amount = max(amount, 10) # Minimum $10
                current_sum += amount
                
            # Random items
            num_items = random.randint(1, 4)
            items = []
            for _ in range(num_items):
                items.append({"name": f"Product {random.randint(100, 999)}", "quantity": random.randint(1, 3)})
                
            o = Order(
                customer_id=c.id,
                amount=amount,
                items=items,
                created_at=dt
            )
            orders_to_create.append(o)
            
        # Update customer created_at to be the first order date
        c.created_at = order_dates[0]
        
    if orders_to_create:
        print(f"Saving {len(orders_to_create)} generated orders...")
        db.bulk_save_objects(orders_to_create)
        db.commit()
    else:
        print("No new orders needed to be generated.")
        
    db.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate_orders()

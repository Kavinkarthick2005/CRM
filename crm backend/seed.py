import random
from datetime import datetime, timezone, timedelta
from db import engine, Base, SessionLocal
from models.models import Customer
from faker import Faker

fake = Faker()

def seed_db():
    print("Creating tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    print("Seeding 200 customers...")
    tags_pool = ["vip", "new", "churned", "frequent"]
    
    customers = []
    for _ in range(200):
        rand_order = random.random()
        if rand_order < 0.25:
            total_orders = 1
        elif rand_order < 0.8:
            total_orders = random.randint(2, 5)
        else:
            total_orders = random.randint(6, 15)
            
        if total_orders >= 6:
            spend_per_order = random.randint(300, 1000)
        else:
            spend_per_order = random.randint(50, 400)
            
        total_spend = total_orders * spend_per_order
        
        rand_days = random.random()
        if rand_days < 0.3:
            last_order_days_ago = random.randint(61, 180)
        else:
            last_order_days_ago = random.randint(1, 60)
            
        last_order_at = datetime.now(timezone.utc) - timedelta(days=last_order_days_ago)
        
        customer_tags = []
        if total_spend >= 3000 or total_orders >= 6:
            customer_tags.append("vip")
            if total_orders >= 6:
                customer_tags.append("frequent")
        elif last_order_days_ago > 90:
            customer_tags.append("churned")
        elif total_orders == 1:
            customer_tags.append("new")
        
        if not customer_tags:
            customer_tags.append(random.choice(tags_pool))

        customer_tags = list(set(customer_tags))
        tags_str = ",".join(customer_tags)
        
        c = Customer(
            name=fake.name(),
            email=fake.email(),
            phone=fake.phone_number(),
            total_spend=total_spend,
            total_orders=total_orders,
            last_order_at=last_order_at,
            channel_preference=random.choice(["email", "sms"]),
            tags=tags_str
        )
        customers.append(c)

    db.bulk_save_objects(customers)
    db.commit()
    print("Seeded successfully.")
    db.close()

if __name__ == "__main__":
    seed_db()

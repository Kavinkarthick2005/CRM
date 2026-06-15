import os
from sqlalchemy import text
from db import engine, SessionLocal, Base
from models.models import Customer, CustomerGroup, CustomerGroupMember, TriggerRule

def migrate():
    print("Starting Phase 1 Migration...")

    # 1. Add company_name to customers using raw SQL
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE customers ADD COLUMN company_name VARCHAR;"))
            conn.execute(text("CREATE INDEX ix_customers_company_name ON customers (company_name);"))
            print("Added company_name to customers table.")
        except Exception as e:
            if "already exists" in str(e) or "Duplicate column" in str(e):
                print("Column company_name already exists.")
            else:
                print(f"Error adding column: {e}")

    # 2. Create new tables (CustomerGroup, CustomerGroupMember, TriggerRule)
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    print("New tables created.")

    # 3. Backfill company_name and create groups
    db = SessionLocal()
    try:
        customers = db.query(Customer).all()
        companies = {} # domain -> Company Name
        
        # Simple domain parser
        for c in customers:
            if c.email and "@" in c.email:
                domain = c.email.split("@")[1].lower()
                company = domain.split(".")[0].capitalize()
                
                # Manual overrides for known domains
                if domain == "gmail.com" or domain == "yahoo.com" or domain == "hotmail.com":
                    continue # Skip generic domains

                c.company_name = company
                
                if company not in companies:
                    companies[company] = []
                companies[company].append(c)

        db.commit()
        print(f"Backfilled company_name for {len(customers)} customers.")

        # 4. Create Company Groups
        for company, cust_list in companies.items():
            group = db.query(CustomerGroup).filter(CustomerGroup.name == company, CustomerGroup.group_type == 'company').first()
            if not group:
                group = CustomerGroup(
                    name=company,
                    description=f"All employees/customers associated with {company}",
                    group_type="company"
                )
                db.add(group)
                db.flush()
                print(f"Created group: {company}")

            # 5. Link customers to groups
            for c in cust_list:
                member = db.query(CustomerGroupMember).filter(CustomerGroupMember.group_id == group.id, CustomerGroupMember.customer_id == c.id).first()
                if not member:
                    member = CustomerGroupMember(group_id=group.id, customer_id=c.id)
                    db.add(member)
        
        db.commit()
        print("Successfully backfilled and created company groups.")

        # 6. Create Behavioral groups
        vip_group = db.query(CustomerGroup).filter(CustomerGroup.name == 'VIP Customers').first()
        if not vip_group:
            vip_group = CustomerGroup(name='VIP Customers', description='Lifetime spend exceeds 1000', group_type='behavioral')
            db.add(vip_group)
            
        at_risk_group = db.query(CustomerGroup).filter(CustomerGroup.name == 'At Risk Customers').first()
        if not at_risk_group:
            at_risk_group = CustomerGroup(name='At Risk Customers', description='Inactive for 30-60 days', group_type='behavioral')
            db.add(at_risk_group)
            
        db.commit()
        print("Created default behavioral groups.")

    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

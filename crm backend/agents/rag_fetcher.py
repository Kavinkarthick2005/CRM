from sqlalchemy.orm import Session
from sqlalchemy import text

class RAGContext(dict):
    def to_prompt_string(self) -> str:
        t = self.get("total_customers", 0)
        if t == 0:
            return "CUSTOMER BASE INSIGHTS: No customers found."
            
        avg_spend = self.get("avg_spend", 0)
        top_20 = self.get("top_20_spend", 0)
        
        act = self.get("recent_activity", {})
        
        tags = self.get("tag_distribution", {})
        tag_str_list = []
        for tag, data in sorted(tags.items(), key=lambda item: item[1]["count"], reverse=True)[:3]:
            tag_str_list.append(f"{data['count']} {tag} (₹{data['avg_spend']:,.0f} avg)")
        tag_str = " | ".join(tag_str_list) if tag_str_list else "None"
        
        ch = self.get("channel_distribution", {})
        ch_str_list = []
        for channel, count in ch.items():
            if count:
                ch_str_list.append(f"{int((count/t)*100)}% {channel.title()}")
        ch_str = " | ".join(ch_str_list) if ch_str_list else "None"
        
        freq = self.get("order_frequency", {})
        
        return f"""CUSTOMER BASE INSIGHTS ({t} total):
- Spend: avg ₹{avg_spend:,.0f} | top 20% spend ₹{top_20:,.0f}+
- Activity: {act.get('inactive_30d', 0)} inactive 30d | {act.get('inactive_60d', 0)} inactive 60d
- Segments: {tag_str}
- Channels: {ch_str}
- Buyers: {freq.get('one_time', 0)} one-time | {freq.get('occasional', 0)} occasional | {freq.get('frequent', 0)} frequent
"""

async def fetch_context(db: Session) -> RAGContext:
    try:
        total_customers = db.execute(text("SELECT COUNT(*) FROM customers")).scalar() or 0
        
        avg_spend_result = db.execute(text("SELECT AVG(total_spend) FROM customers")).scalar()
        avg_spend = float(avg_spend_result) if avg_spend_result else 0.0
        
        top_20_spend_result = db.execute(text("SELECT PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY total_spend) FROM customers")).scalar()
        top_20_spend = float(top_20_spend_result) if top_20_spend_result else 0.0
        
        avg_orders_result = db.execute(text("SELECT AVG(total_orders) FROM customers")).scalar()
        avg_orders = float(avg_orders_result) if avg_orders_result else 0.0
        
        # Spend Distribution
        spend_dist = db.execute(text("""
            SELECT 
                SUM(CASE WHEN total_spend BETWEEN 0 AND 500 THEN 1 ELSE 0 END),
                SUM(CASE WHEN total_spend > 500 AND total_spend <= 1000 THEN 1 ELSE 0 END),
                SUM(CASE WHEN total_spend > 1000 AND total_spend <= 2000 THEN 1 ELSE 0 END),
                SUM(CASE WHEN total_spend > 2000 AND total_spend <= 5000 THEN 1 ELSE 0 END),
                SUM(CASE WHEN total_spend > 5000 THEN 1 ELSE 0 END)
            FROM customers
        """)).fetchone()
        
        spend_distribution = {
            "0_500": spend_dist[0] if spend_dist else 0,
            "500_1000": spend_dist[1] if spend_dist else 0,
            "1000_2000": spend_dist[2] if spend_dist else 0,
            "2000_5000": spend_dist[3] if spend_dist else 0,
            "5000_plus": spend_dist[4] if spend_dist else 0,
        }
        
        # Order Frequency
        freq_dist = db.execute(text("""
            SELECT 
                SUM(CASE WHEN total_orders = 1 THEN 1 ELSE 0 END),
                SUM(CASE WHEN total_orders BETWEEN 2 AND 3 THEN 1 ELSE 0 END),
                SUM(CASE WHEN total_orders >= 4 THEN 1 ELSE 0 END)
            FROM customers
        """)).fetchone()
        
        order_frequency = {
            "one_time": freq_dist[0] if freq_dist else 0,
            "occasional": freq_dist[1] if freq_dist else 0,
            "frequent": freq_dist[2] if freq_dist else 0
        }
        
        # Channel distribution
        channel_dist_rows = db.execute(text("SELECT channel_preference, COUNT(*) FROM customers GROUP BY channel_preference")).fetchall()
        channel_distribution = {row[0]: row[1] for row in channel_dist_rows if row[0]}
        
        # Recent Activity
        activity_dist = db.execute(text("""
            SELECT 
                SUM(CASE WHEN last_order_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END),
                SUM(CASE WHEN last_order_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END),
                SUM(CASE WHEN last_order_at < NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END),
                SUM(CASE WHEN last_order_at < NOW() - INTERVAL '60 days' THEN 1 ELSE 0 END),
                SUM(CASE WHEN last_order_at < NOW() - INTERVAL '90 days' THEN 1 ELSE 0 END)
            FROM customers
        """)).fetchone()
        
        recent_activity = {
            "active_7d": activity_dist[0] if activity_dist else 0,
            "active_30d": activity_dist[1] if activity_dist else 0,
            "inactive_30d": activity_dist[2] if activity_dist else 0,
            "inactive_60d": activity_dist[3] if activity_dist else 0,
            "inactive_90d": activity_dist[4] if activity_dist else 0,
        }
        
        # Tags Distribution
        tags_result = db.execute(text("""
            SELECT unnest(string_to_array(tags, ',')) as tag, COUNT(*) as count, AVG(total_spend) as avg_spend 
            FROM customers WHERE tags IS NOT NULL GROUP BY tag
        """)).fetchall()
        
        tag_distribution = {}
        best_performing_segment = None
        highest_avg = -1
        
        for row in tags_result:
            if row[0]:
                tag = row[0].strip()
                count = row[1]
                avg = float(row[2]) if row[2] else 0.0
                tag_distribution[tag] = {
                    "count": count,
                    "pct": round((count / total_customers) * 100, 1) if total_customers else 0,
                    "avg_spend": avg
                }
                if avg > highest_avg:
                    highest_avg = avg
                    best_performing_segment = tag
        
        print("[🔍 RAG v2] Context fetched successfully")
        
        return RAGContext({
            "total_customers": total_customers,
            "avg_spend": avg_spend,
            "top_20_spend": top_20_spend,
            "avg_orders": avg_orders,
            "spend_distribution": spend_distribution,
            "order_frequency": order_frequency,
            "channel_distribution": channel_distribution,
            "recent_activity": recent_activity,
            "tag_distribution": tag_distribution,
            "best_performing_segment": best_performing_segment
        })
        
    except Exception as e:
        db.rollback()
        print(f"Error fetching RAG context: {e}")
        return RAGContext({
            "total_customers": 0,
            "avg_spend": 0.0,
            "top_20_spend": 0.0,
            "avg_orders": 0.0,
            "spend_distribution": {},
            "order_frequency": {},
            "channel_distribution": {},
            "recent_activity": {},
            "tag_distribution": {},
            "best_performing_segment": None
        })

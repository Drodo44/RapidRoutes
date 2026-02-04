-- Seed data for ai_prompts table

INSERT INTO public.ai_prompts (title, description, category, html_content)
VALUES 
(
    'Rate Negotiation Email',
    'Professional email template for negotiating rates with carriers.',
    'Logistics',
    'Subject: Load Availability - [Origin] to [Destination]

Hi [Dispatcher Name],

I hope you are doing well.

I have a load available picking up in [Origin] on [Date] delivering to [Destination].
Commodity: [Commodity]
Weight: [Weight]
Equipment: [Equipment Type]

We are looking to move this at $[Target Rate]. Please let me know if you have a truck available.

Best regards,
[Your Name]'
),
(
    'Freight Market Update Post',
    'LinkedIn post template for weekly market updates.',
    'Creative',
    '🚚 Freight Market Update: [Week/Month]

The freight market is showing some interesting trends this week!

📈 Rates: We are seeing a [Increase/Decrease] in spot rates for [Equipment Type] out of the [Region].
📉 Capacity: Capacity is [Tightening/Loosening] in the [Region].

Key takeaways for shippers:
1. [Takeaway 1]
2. [Takeaway 2]
3. [Takeaway 3]

#Logistics #SupplyChain #Freight #Trucking #MarketUpdate'
),
(
    'Detention Request Email',
    'Formal request for detention pay documentation.',
    'Logistics',
    'Subject: Detention Request - Load #[Load Number]

Hi [Customer Name],

Please be advised that driver [Driver Name] arrived at the shipper/receiver at [Arrival Time] and was not loaded/unloaded until [Departure Time].

Total detention time: [Hours] hours.
Free time allowed: 2 hours.
Billable detention: [Billable Hours] hours at $[Rate]/hour.

Attached is the signed BOL with in/out times. Please update the rate confirmation to reflect this charge.

Thank you,
[Your Name]'
),
(
    'Cold Call Script - New Carrier',
    'Script for onboarding new carriers to your network.',
    'General',
    'Hi, is this [Dispatcher Name]?

This is [Your Name] with [Company Name]. I see you guys run a lot of [Equipment Type] out of [City/State].

We have consistent freight in that lane and I wanted to see if we could get you set up as a preferred carrier. We offer [Payment Terms] and [Other Benefits].

Do you have a moment to discuss your current capacity?

[Your Name]'
),
(
    'Load Recovery Email',
    'Urgent email when a carrier falls off a load.',
    'Logistics',
    'Subject: URGENT: Truck Needed - [Origin] to [Destination] - TODAY

Team,

We had a truck fall off last minute. Need immediate recovery.

Lane: [Origin] -> [Destination]
Pick: TODAY [Time]
Drop: [Delivery Date]
Commodity: [Commodity]
Weight: [Weight]

Rate is negotiable for reliable service. Please call me at [Phone Number] if you can help.

[Your Name]'
);

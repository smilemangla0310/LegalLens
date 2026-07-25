from database.crud import (
    create_business_profile,
    update_business_profile,
    get_business_profile
)

def get_or_create_default_profile() -> dict:
    """
    Returns existing profile or creates a sensible default MSME profile for LegalLens context.
    """
    profile = get_business_profile()
    if not profile:
        default_data = {
            "name": "LensCraft Enterprises",
            "industry": "Manufacturing & Wholesale Trade",
            "business_type": "Private Limited",
            "size": "Small",
            "state": "Maharashtra",
            "gst_registered": True,
            "gst_number": "27AAACL1234H1Z5",
            "products_services": "Precision Precision Components & Industrial Supplies",
            "employee_count": 28,
            "licenses": ["Udyam Registration", "GST Certificate", "Factory License"],
            "compliance_categories": ["GST Filings", "EPF/ESI", "MSME Delayed Payment Safeguards"],
            "vendor_info": ["Raw Material Suppliers", "Logistics Partners"],
            "customer_type": "B2B Commercial Customers"
        }
        profile = create_business_profile(default_data)
    return profile


def update_profile(data: dict) -> dict:
    profile = get_or_create_default_profile()
    return update_business_profile(profile["id"], data)

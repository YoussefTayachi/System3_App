"""Unit-Tests für die reinen Parse-Funktionen (kein Netz, keine DB)."""
from worker.pipelines.find_decisionmaker import parse_persons
from worker.pipelines.get_businesses import parse_place
from worker.pipelines.hunt_persons import extract_domain, parse_hunter_emails


def test_parse_place_full():
    p = {
        "id": "ChIJxyz",
        "displayName": {"text": "Hayes Spice", "languageCode": "en"},
        "formattedAddress": "55 Coldharbour Ln, Hayes UB3 3EE, UK",
        "nationalPhoneNumber": "07722 008595",
        "internationalPhoneNumber": "+44 7722 008595",
        "websiteUri": "https://hayesspice.co.uk/",
        "rating": 4.5,
        "priceLevel": "PRICE_LEVEL_MODERATE",
    }
    row = parse_place(p)
    assert row["place_id"] == "ChIJxyz"
    assert row["name"] == "Hayes Spice"
    assert row["website"] == "https://hayesspice.co.uk/"
    assert row["rating"] == 4.5


def test_parse_place_minimal():
    row = parse_place({"displayName": {"text": "X"}})
    assert row["name"] == "X"
    assert row["website"] is None
    assert row["place_id"] is None


def test_extract_domain():
    assert extract_domain("https://www.pheasant-restaurant.co.uk/") == "pheasant-restaurant.co.uk"
    assert extract_domain("http://yangs-asian.com/menu") == "yangs-asian.com"
    assert extract_domain("hautedolci.co.uk") == "hautedolci.co.uk"


def test_hunter_filters_invalid():
    # Realdaten-Struktur aus dem n8n-Pin: alle 'invalid' -> alles gefiltert
    payload = {
        "data": {
            "emails": [
                {
                    "value": "alli@hautedolci.co.uk",
                    "first_name": "Hamzah",
                    "last_name": "Alli",
                    "position": "Director of Development",
                    "seniority": "executive",
                    "department": "executive",
                    "confidence": 94,
                    "linkedin": "https://www.linkedin.com/in/hamzah-alli",
                    "twitter": None,
                    "verification": {"status": "invalid"},
                },
                {
                    "value": "ok@hautedolci.co.uk",
                    "first_name": "Adam",
                    "last_name": "Moosa",
                    "position": "Manager",
                    "seniority": "senior",
                    "department": "management",
                    "confidence": 94,
                    "linkedin": None,
                    "twitter": None,
                    "verification": {"status": "accept_all"},
                },
            ]
        }
    }
    rows = parse_hunter_emails(payload)
    assert len(rows) == 1
    assert rows[0]["email"] == "ok@hautedolci.co.uk"
    assert rows[0]["full_name"] == "Adam Moosa"
    assert rows[0]["source"] == "hunter"


def test_parse_persons_na_handling():
    data = {
        "company_name": "MoreYoga",
        "persons": [
            {
                "name": "Shamir Sidhu",
                "title": "owner",
                "email": "NA",
                "linkedin": "https://linkedin.com/in/shamir",
                "instagram": "NA",
                "twitter": "NA",
                "facebook": "NA",
            },
            {
                "name": "NA",
                "title": "NA",
                "email": "NA",
                "linkedin": "NA",
                "instagram": "NA",
                "twitter": "NA",
                "facebook": "NA",
            },
        ],
    }
    rows = parse_persons(data)
    assert len(rows) == 1
    assert rows[0]["first_name"] == "Shamir"
    assert rows[0]["last_name"] == "Sidhu"
    assert rows[0]["email"] is None
    assert rows[0]["linkedin"] == "https://linkedin.com/in/shamir"


def test_is_company_name():
    from worker.pipelines.find_decisionmaker import is_company_name

    assert is_company_name("Vilevi GmbH")
    assert is_company_name("S&P Global Co., Ltd.")
    assert is_company_name("S&P Restaurants Ltd.")
    assert is_company_name("ACME Holding")
    assert not is_company_name("Shamir Sidhu")
    assert not is_company_name("Renate Kornas")
    assert not is_company_name("Dr. Stefan Kudlacek")


def test_build_system_prompt():
    from worker.pipelines.personalize import DEFAULT_STYLE, build_system_prompt

    assert DEFAULT_STYLE in build_system_prompt(None)
    assert DEFAULT_STYLE in build_system_prompt("   ")
    custom = 'Menschlich und locker, z.B. "Hey, hab gesehen du arbeitest mit Tieren..."'
    prompt = build_system_prompt(custom)
    assert custom in prompt
    assert DEFAULT_STYLE not in prompt

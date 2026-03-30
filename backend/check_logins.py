import urllib.request, json
BASE = "http://localhost:8000/api"
PASSWORD = "Clario@2026!"

for email in [
    "admin@platform.com",
    "owner@demo.com", "tenantadmin@demo.com", "manager@demo.com", "agent@demo.com",
    "owner@swiftroute.com", "admin@swiftroute.com", "manager@swiftroute.com", "agent1@swiftroute.com", "agent2@swiftroute.com",
]:
    try:
        r = urllib.request.urlopen(urllib.request.Request(
            BASE+"/auth/login",
            json.dumps({"email": email, "password": PASSWORD}).encode(),
            {"Content-Type": "application/json"}, method="POST"))
        tok = json.loads(r.read())["access_token"]
        me = json.loads(urllib.request.urlopen(urllib.request.Request(
            BASE+"/auth/me", headers={"Authorization": "Bearer "+tok})).read())
        print(f"  OK  role={me['role']:10}  email={me['email']}")
    except Exception as e:
        print(f"  FAIL {email}: {e}")

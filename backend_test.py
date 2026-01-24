#!/usr/bin/env python3
"""
Backend API Testing for Jewellery ERP System
Tests health, auth, and sync APIs
"""

import requests
import sys
import json
from datetime import datetime

class JewelleryERPTester:
    def __init__(self, base_url="https://modern-erp-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def test_health_api(self):
        """Test /api/health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health API", True, f"Status: {data.get('status')}, Version: {data.get('version')}")
                    return True
                else:
                    self.log_test("Health API", False, f"Unexpected status: {data.get('status')}")
                    return False
            else:
                self.log_test("Health API", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Health API", False, f"Exception: {str(e)}")
            return False

    def test_auth_login(self, email="admin@jewellery.com", password="admin123"):
        """Test /api/auth/login endpoint"""
        try:
            payload = {
                "email": email,
                "password": password
            }
            
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    self.token = data["token"]
                    self.log_test("Auth Login", True, f"Token received, user: {data.get('user', {}).get('email', 'unknown')}")
                    return True
                else:
                    self.log_test("Auth Login", False, "No token in response")
                    return False
            else:
                self.log_test("Auth Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Auth Login", False, f"Exception: {str(e)}")
            return False

    def test_sync_status(self):
        """Test /api/sync/status endpoint (requires auth)"""
        if not self.token:
            self.log_test("Sync Status", False, "No auth token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{self.base_url}/api/sync/status",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "online":
                    collections = data.get("collections", {})
                    self.log_test("Sync Status", True, f"Status: {data.get('status')}, Collections: {len(collections)}")
                    return True
                else:
                    self.log_test("Sync Status", False, f"Unexpected status: {data.get('status')}")
                    return False
            else:
                self.log_test("Sync Status", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Sync Status", False, f"Exception: {str(e)}")
            return False

    def test_sync_pull(self):
        """Test /api/sync/pull endpoint (requires auth)"""
        if not self.token:
            self.log_test("Sync Pull", False, "No auth token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{self.base_url}/api/sync/pull",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    changes = data.get("changes", {})
                    total_changes = data.get("total_changes", 0)
                    self.log_test("Sync Pull", True, f"Success: {data.get('success')}, Total changes: {total_changes}")
                    return True
                else:
                    self.log_test("Sync Pull", False, f"Success flag false: {data}")
                    return False
            else:
                self.log_test("Sync Pull", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Sync Pull", False, f"Exception: {str(e)}")
            return False

    def test_sync_push(self):
        """Test /api/sync/push endpoint with sample data"""
        if not self.token:
            self.log_test("Sync Push", False, "No auth token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            # Sample sync data
            test_item = {
                "id": f"test_item_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "name": "Test Item",
                "category": "Test Category",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            payload = {
                "items": [{
                    "collection": "items",
                    "document_id": test_item["id"],
                    "action": "create",
                    "data": test_item,
                    "local_timestamp": datetime.now().isoformat(),
                    "client_id": "test_client_123"
                }],
                "client_id": "test_client_123"
            }
            
            response = requests.post(
                f"{self.base_url}/api/sync/push",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results = data.get("results", {})
                    synced = len(results.get("synced", []))
                    conflicts = len(results.get("conflicts", []))
                    errors = len(results.get("errors", []))
                    self.log_test("Sync Push", True, f"Synced: {synced}, Conflicts: {conflicts}, Errors: {errors}")
                    return True
                else:
                    self.log_test("Sync Push", False, f"Success flag false: {data}")
                    return False
            else:
                self.log_test("Sync Push", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Sync Push", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for Jewellery ERP")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test health endpoint first
        health_ok = self.test_health_api()
        
        # Test authentication
        auth_ok = self.test_auth_login()
        
        # Test sync endpoints (require auth)
        if auth_ok:
            self.test_sync_status()
            self.test_sync_pull()
            self.test_sync_push()
        else:
            print("⚠️  Skipping sync tests due to auth failure")
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            return 1

    def get_test_results(self):
        """Get detailed test results"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "results": self.test_results
        }

def main():
    tester = JewelleryERPTester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    results = tester.get_test_results()
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())
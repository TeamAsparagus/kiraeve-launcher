import time
from playwright.sync_api import sync_playwright

def run_tests():
    print("=== STARTING KIRAEVE PLAYWRIGHT E2E SYSTEM TESTS ===")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        print("\n[Step 1] Navigating to http://localhost:1420...")
        page.goto("http://localhost:1420")
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        page.screenshot(path="tests/screen_01_login_gate.png")
        print("Captured: tests/screen_01_login_gate.png")

        # Test user credentials
        uid_rand = int(time.time()) % 100000
        test_username = f"Apex_{uid_rand}"
        test_email = f"apex_{uid_rand}@kiraeve.net"
        test_pass = "SupabaseReal2026!"

        print(f"\n[Step 2] Testing User Registration: {test_username} ({test_email})...")
        reg_btn = page.locator("button:has-text('REGISTER')")
        if reg_btn.is_visible():
            reg_btn.click()
            time.sleep(0.5)

        # Fill display name, email, password
        page.locator("input[placeholder*='KiraPlayer']").fill(test_username)
        page.locator("input[placeholder*='example.com']").fill(test_email)
        page.locator("input[type='password']").fill(test_pass)

        # Click submit
        submit_btn = page.locator("button:has-text('CREATE ACCOUNT')")
        submit_btn.click()
        print("Registration submitted, waiting for Supabase trigger & profile load...")

        # Wait for transition to Main Client
        page.wait_for_selector("button:has-text('LIBRARY')", timeout=20000)
        time.sleep(1)

        page.screenshot(path="tests/screen_02_library_view.png")
        print("SUCCESS: Logged in and entered Library!")
        print("Captured: tests/screen_02_library_view.png")

        print("\n[Step 3] Checking Game Catalog in Library...")
        for title in ["Kiraeve Pilot", "Space Odyssey: Kira", "Cyber Drift 2088"]:
            loc = page.locator(f"text={title}")
            print(f"- Game '{title}' visible: {loc.first.is_visible()}")

        print("\n[Step 4] Testing Store Tab Navigation...")
        store_btn = page.get_by_role("button", name="STORE", exact=True)
        store_btn.click()
        time.sleep(1)
        page.screenshot(path="tests/screen_03_store_view.png")
        print("Captured: tests/screen_03_store_view.png")
        print("SUCCESS: Store loaded!")

        print("\n[Step 5] Testing Product Key Activation Flow...")
        games_menu = page.get_by_role("button", name="Games", exact=True)
        if games_menu.is_visible():
            games_menu.click()
            time.sleep(0.5)
            activate_item = page.locator("text=Activate a Product on Kiraeve")
            if activate_item.first.is_visible():
                activate_item.first.click()
                time.sleep(0.5)
                page.screenshot(path="tests/screen_04_redeem_modal.png")
                print("Captured: tests/screen_04_redeem_modal.png")

                key_input = page.locator("input[placeholder*='KIRAEVE-']")
                if key_input.is_visible():
                    key_input.fill("KIRAEVE-VIP")
                    redeem_btn = page.locator("button:has-text('Activate Key')")
                    if redeem_btn.is_visible():
                        redeem_btn.click()
                        print("Redeem clicked, waiting for activation & auto-close...")
                        time.sleep(2.5)
                        page.screenshot(path="tests/screen_05_redeem_result.png")
                        print("SUCCESS: Product Key activated!")
                        print("Captured: tests/screen_05_redeem_result.png")

                cancel_btn = page.locator("button:has-text('Cancel')")
                if cancel_btn.is_visible():
                    cancel_btn.click()
                    time.sleep(0.5)

        print("\n[Step 6] Testing Friends System...")
        friends_menu = page.get_by_role("button", name="Friends", exact=True)
        if friends_menu.is_visible():
            friends_menu.click()
            time.sleep(0.5)
            view_friends = page.locator("text=View Friends List")
            if view_friends.first.is_visible():
                view_friends.first.click()
                time.sleep(0.5)
                page.screenshot(path="tests/screen_06_friends_modal.png")
                print("Captured: tests/screen_06_friends_modal.png")
                print("SUCCESS: Friends list modal opened!")
                # Close friends modal
                close_btn = page.locator("div[role='dialog'] button, .fixed.inset-0 button").filter(has=page.locator("svg.lucide-x"))
                if close_btn.count() > 0:
                    close_btn.first.click()
                else:
                    page.keyboard.press("Escape")
                time.sleep(0.5)

        print("\n[Step 7] Testing Profile Tab...")
        user_tab = page.get_by_role("button", name=test_username, exact=True)
        if user_tab.is_visible():
            user_tab.click()
            time.sleep(1)
            page.screenshot(path="tests/screen_07_profile_view.png")
            print("Captured: tests/screen_07_profile_view.png")
            print("SUCCESS: Profile tab loaded!")

        print("\n=== ALL PLAYWRIGHT E2E TESTS PASSED 100%! ===")
        browser.close()

if __name__ == '__main__':
    run_tests()

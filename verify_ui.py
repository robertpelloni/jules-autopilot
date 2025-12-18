from playwright.sync_api import sync_playwright

def verify_session_keeper_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Pre-set local storage with a dummy API key to bypass the setup screen
        # We need to do this before navigating or immediately after

        # Option 1: Navigate to a blank page on the same origin, set storage, then go to home
        # But we need the server to be running.

        page = context.new_page()
        page.goto("http://localhost:3000")

        # Inject local storage
        page.evaluate("window.localStorage.setItem('jules-api-key', 'dummy-key')")

        # Reload to pick up the key
        page.reload()

        # Check if the title contains "Jules"
        title = page.title()
        print(f"Page title: {title}")

        # Wait for Header (which should appear now that we have an API key)
        try:
            page.wait_for_selector("header", timeout=5000)
            print("Found header")
        except:
            print("Header NOT found within timeout")
            # Maybe it failed to load session list or something, but the layout should be there.

        # 3. Session Keeper Sidebar Toggle (RotateCw icon button)
        keeper_toggle = page.query_selector("button[title='Toggle Auto-Pilot Sidebar']")
        if keeper_toggle:
            print("Found Session Keeper Sidebar toggle")
        else:
            print("Session Keeper Sidebar toggle NOT found")

        # 4. Session Keeper Logs Toggle (Activity icon button)
        logs_toggle = page.query_selector("button[title='Toggle Auto-Pilot Logs']")
        if logs_toggle:
            print("Found Session Keeper Logs toggle")
             # Try to click it
            logs_toggle.click()
            # Wait a bit for animation
            page.wait_for_timeout(1000)

            # Check if log panel appeared
            # Look for "Session Keeper Activity Log" text
            log_panel = page.get_by_text("Session Keeper Activity Log")
            if log_panel.is_visible():
                print("Session Keeper Log Panel is visible after toggle")
            else:
                print("Session Keeper Log Panel NOT visible after toggle")

        else:
            print("Session Keeper Logs toggle NOT found")

        browser.close()

if __name__ == "__main__":
    verify_session_keeper_layout()

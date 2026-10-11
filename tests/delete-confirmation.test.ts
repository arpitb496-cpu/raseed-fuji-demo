import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Delete Flow Safety & Confirmation Step", () => {
  const settingsPagePath = path.resolve(__dirname, "../src/app/app/settings/page.tsx");
  const deleteRoutePath = path.resolve(__dirname, "../src/app/api/merchant/profile/route.ts");

  it("verifies DELETE handler in /api/merchant/profile destroys session on success", () => {
    const routeContent = fs.readFileSync(deleteRoutePath, "utf-8");
    expect(routeContent).toContain("session.destroy()");
  });

  it("verifies settings page enforces typing DELETE to enable confirm button", () => {
    const settingsContent = fs.readFileSync(settingsPagePath, "utf-8");

    // 1. Input element with id delete-confirm-input
    expect(settingsContent).toContain('id="delete-confirm-input"');

    // 2. Button with id confirm-delete-data-btn
    expect(settingsContent).toContain('id="confirm-delete-data-btn"');

    // 3. Confirm button disabled condition requires DELETE
    expect(settingsContent).toContain('deleteConfirmInput.trim() !== "DELETE"');

    // 4. Bilingual warning explaining anonymization & paid records retention
    expect(settingsContent).toContain("Personal data (merchant name, client contacts, business info) will be permanently anonymized");
    expect(settingsContent).toContain("Settled payment events and invoice records are preserved for accounting and tax compliance");
    expect(settingsContent).toContain("व्यक्तिगत डेटा (नाम, संपर्क, व्यवसाय विवरण) स्थायी रूप से अज्ञात (anonymized) कर दिया जाएगा");
    expect(settingsContent).toContain("वित्तीय लेखांकन एवं कानूनी अनुपालन के लिए भुगतान किए गए रिकॉर्ड और लेनदेन इतिहास सुरक्षित रखे जाएंगे");
  });
});

describe("MeToken Resubscribe - new curve", () => {
  before(async () => {});

  describe("Warmup", () => {
    it("mint(): meTokens received based on initial Curve", async () => {});
    it("burn() [buyer]: assets received based on initial Curve", async () => {});
    it("burn() [owner]: assets received based on initial Curve", async () => {});
  });

  describe("Duration", () => {
    it("mint(): meTokens received based on weighted average of Curves", async () => {});
    it("burn() [buyer]: assets received based on weighted average of Curves", async () => {});
    it("burn() [owner]: assets received based on weighted average of Curves", async () => {});
  });

  describe("Cooldown", () => {
    it("mint(): assets received based on target Curve", async () => {});
    it("burn() [buyer]: assets received based on target Curve", async () => {});
    it("burn() [owner]: assets received based on target Curve", async () => {});
  });
});

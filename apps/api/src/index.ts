const express = require("express");
const cors = require("cors");

const { getStellarMarkets } = require("./services/xoxno/xoxno.service");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/xoxno/markets", async (_req: any, res: any) => {
  try {
    const markets = await getStellarMarkets();

    res.json({
      success: true,
      data: markets,
    });
  } catch (error) {
    console.error("XOXNO markets error:", error);

    res.status(500).json({
      success: false,
      error: "No se pudieron obtener los mercados de XOXNO",
    });
  }
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

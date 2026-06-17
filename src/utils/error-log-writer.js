const path = require("node:path");
const fs = require("node:fs/promises");

const CLIENT_ERROR_LOG_DIR = path.join(process.cwd(), "logs", "frontend-errors");

function getDailyClientErrorLogFilePath() {
  const datePart = new Date().toISOString().slice(0, 10);
  return path.join(CLIENT_ERROR_LOG_DIR, `client-errors-${datePart}.jsonl`);
}

async function appendClientErrorLog(entry) {
  const filePath = getDailyClientErrorLogFilePath();
  await fs.mkdir(CLIENT_ERROR_LOG_DIR, { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
  return filePath;
}

module.exports = {
  appendClientErrorLog,
  getDailyClientErrorLogFilePath,
};

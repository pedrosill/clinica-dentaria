const HttpError = require('./httpError');

function parseNumericId(value, fieldName) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }

  return parsedValue;
}

function parseDateOnly(value, fieldName) {
  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }

  return parsedDate;
}

module.exports = {
  parseNumericId,
  parseDateOnly,
};
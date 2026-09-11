const HttpError = require('./httpError');

function parseNumericId(value, fieldName) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }

  return parsedValue;
}

function parseDateOnly(value, fieldName) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }

  return parsedDate;
}

module.exports = {
  parseNumericId,
  parseDateOnly,
};

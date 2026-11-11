// Tests pin UTC, like the Swift TestClock's calendar.
module.exports = async () => {
  process.env.TZ = 'UTC';
};

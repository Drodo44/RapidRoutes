// tests/datHeaders.test.js
import { DAT_HEADERS } from "../lib/datHeaders.js";

const EXPECT = [
  "Pickup Earliest*",
  "Pickup Latest*",
  "Length (ft)*",
  "Weight (lbs)*",
  "Full/Partial*",
  "Equipment*",
  "Use Private Network*",
  "Private Network Rate",
  "Allow Private Network Booking",
  "Allow Private Network Bidding",
  "Use DAT Load Board*",
  "DAT Load Board Rate",
  "Allow DAT Load Board Booking",
  "Use Extended Network",
  "Contact Method*",
  "Origin City*",
  "Origin State*",
  "Origin Postal Code",
  "Destination City*",
  "Destination State*",
  "Destination Postal Code",
  "Comment",
  "Commodity",
  "Reference ID (unique per organization; max 8 chars)",
];

describe("DAT header order", () => {
  it("matches spec exactly", () => {
    expect(DAT_HEADERS).toEqual(EXPECT);
  });
});

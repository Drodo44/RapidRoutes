// tests/datHeaders.test.js
import { DAT_HEADERS } from "../lib/datCsvBuilder.js";

const EXPECT = [
  "Pickup Earliest*",
  "Pickup Latest",
  "Length (ft)*",
  "Weight (lbs)*",
  "Full/Partial*",
  "Equipment*",
  "Use Private Network*",
  "Private Network Rate",
  "Allow Private Network Booking",
  "Allow Private Network Bidding",
  "Use DAT Loadboard*",
  "DAT Loadboard Rate",
  "Allow DAT Loadboard Booking",
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
  "Reference ID",
];

describe("DAT header order", () => {
  it("matches spec exactly", () => {
    expect(DAT_HEADERS).toEqual(EXPECT);
  });
});

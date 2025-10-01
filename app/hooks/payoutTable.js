// payoutTable.js
// Multipliers relative to TOTAL BET (not coin value).
// The UI will multiply these by the live total bet to show $ amounts.
export const payoutTable = {
  // premium symbols
  "dog.png": { 5: 37.5, 4: 7.5, 3: 2.5 }, // 100$ bet: 3750 / 750 / 250
  "milu.png": { 5: 25.0, 4: 5.0, 3: 1.75 }, // 2500 / 500 / 175
  "pug.png": { 5: 15.0, 4: 3.0, 3: 1.25 }, // 1500 / 300 / 125
  "taxa.png": { 5: 10.0, 4: 2.0, 3: 1.0 }, // 1000 / 200 / 100
  "collar.png": { 5: 7.5, 4: 1.25, 3: 0.6 }, // 750 / 125 / 60
  "bone.png": { 5: 5.0, 4: 1.0, 3: 0.4 }, // 500 / 100 / 40

  // royals
  "a.png": { 5: 2.5, 4: 0.5, 3: 0.25 }, // 250 / 50 / 25
  "k.png": { 5: 2.5, 4: 0.5, 3: 0.25 }, // 250 / 50 / 25
  "q.png": { 5: 1.25, 4: 0.25, 3: 0.1 }, // 125 / 25 / 10
  "j.png": { 5: 1.25, 4: 0.25, 3: 0.1 }, // 125 / 25 / 10
  "ten.png": { 5: 1.25, 4: 0.25, 3: 0.1 }, // 125 / 25 / 10
};

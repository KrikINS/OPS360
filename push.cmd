git add .
git commit -m "fix: product pricing logic and field labels

Pricing Logic:
- MRP is now the primary entry field (ceiling price)
- Unit Rate (Ex-GST) auto-calculates from MRP / (1 + gst/100)
- Min Sell Price capped at MRP — can never exceed it
- Gross Margin % auto-calculates from MRP vs Dealer Cost
- Validation blocks: dealer_price > MRP, min_sell < dealer_price
- Warning shown when min_sell < 5% headroom from MRP

Labels updated for clarity:
- Unit Rate (Excl. Tax) → Unit Rate (Ex-GST) — read only
- MRP (Incl. Tax) → MRP / Retail Price — primary field
- Dealer Price → Dealer Cost — excl. GST
- Min Sell Price → read only, auto-calculated
- Margin % → Gross Margin % — auto-calculated"

git checkout staging
git merge main
git push origin staging
git checkout main
git push origin main

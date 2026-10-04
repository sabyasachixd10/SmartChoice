# Recommendations Architecture

The Recommendation Engine (`backend/services/recommendationService.js`) layers personalization onto the base SmartChoice Score.

## Methodology
The final recommendation score is a weighted composite, isolating the deterministic quality metric (SmartChoice) from subjective preferences.

### Base Weights
Located in `config/scoringConfig.js`:
- `smartChoiceWeight`: 0.70 (70%)
- `preferenceWeight`: 0.30 (30%)

### The Formula
```
Final Score = 
  (SmartChoice Score * 0.70) +
  (Personalization Score * 0.30)
```
If a product fails a hard constraint (e.g., contains an avoided allergen), it is marked `isEligible: false` and placed at the bottom of the rankings with a `Final Score` of `0`.

### Personalization Score Calculation
- MATCH = 100 points
- UNKNOWN = 50 points
- NO_MATCH = 0 points

The score is the average of all evaluated preferences.

### Deterministic Ranking Rules
Products are ranked exactly in this order:
1. `isEligible` (true before false)
2. `finalScore` (Descending)
3. `smartChoiceScore` (Descending - tie breaker)
4. `productName` (Ascending - final deterministic tie breaker)

## API Endpoints
- `GET /api/preferences/default`: Fetch baseline preference object.
- `POST /api/recommendations`: Pass `productIds` and `preferences` to get fully ranked objects containing base scores, match states, and textual explanations.

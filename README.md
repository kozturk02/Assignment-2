# SmartFarm Crop Dashboard

SmartFarm is a full-stack crop dashboard built with React, Node.js/Express and SQLite. Crop Cards are stored in SQLite, while simulated sensor readings are read from backend/data/sensor-readings.json.

## Setup and run

Backend:
1. Open a terminal in the backend folder.
2. Run npm install.
3. Run node index.js.

Frontend:
1. Open another terminal in the frontend folder.
2. Run npm install.
3. Run npm run dev.

## URLs

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Database creation and seeding

SQLite stores Crop Cards only. When the backend starts, the crops table is created if required. Tomato, Lettuce and Wheat are seeded only when the table is empty. Maize is not seeded so it can be created through the UI.

Seed cards:
- Tomato — Greenhouse A — target 55-75 — normal water 500 L
- Lettuce — Greenhouse B — target 60-80 — normal water 400 L
- Wheat — North Field — target 35-55 — normal water 300 L

## API routes

- GET /api/crops — return all Crop Cards
- GET /api/crops/:id — return one Crop Card
- POST /api/crops — create a Crop Card
- PUT /api/crops/:id — update allowed Crop Card fields
- DELETE /api/crops/:id — delete a Crop Card only
- GET /api/readings — read and validate the sensor JSON file

DELETE success returns:

{ "deleted": true, "id": number }

## Error format

Failed API responses use:

{ "error": "Clear message describing the problem" }

Important status codes include:
- 400 for invalid Crop Card data, an invalid crop_name, or attempting to change crop_name
- 404 when a Crop Card does not exist
- 409 when crop_name already exists
- 500 when sensor file validation fails or an unexpected server/database error occurs

## Data ownership

Crop Cards belong to SQLite and can be created, edited and deleted by the user.

Sensor readings belong to backend/data/sensor-readings.json and are read-only inside the application. Crop Card CRUD never changes this file.

Dashboard results such as condition, recommended water, alerts and Overall Farm Status are calculated in React and are not stored in SQLite.

## Exact crop_name matching

crop_name is the exact, case-sensitive key connecting Crop Cards and sensor readings. For example, Tomato matches Tomato but does not match tomato.

The Add Crop Card dropdown uses crop names returned by GET /api/readings and removes names already used by existing Crop Cards.

## Latest timestamp logic

For each Crop Card, React filters readings by the exact crop_name and selects the greatest timestamp. The JSON array order is not used to decide which reading is newest.

## Sensor file validation

GET /api/readings accepts the sensor file only when:
- the top-level value is an array with exactly 20 objects
- there are exactly five readings for each of Tomato, Lettuce, Wheat and Maize
- every object has exactly the seven required fields and correct types
- timestamps use YYYY-MM-DDTHH:mm:ss, are valid calendar date-times, and do not repeat within the same crop
- sensor_status is Online, Offline or Faulty
- exactly one numeric sensor value is deliberately outside its normal business range

If structural validation fails, the whole file is rejected with HTTP 500 instead of returning partial data.

## Dashboard decision priority

The latest matching reading is analysed in this order:
1. Offline or Faulty -> Sensor Problem, recommended water N/A, Check sensor
2. Online reading with moisture outside 0-100, temperature outside 0-50, or rainfall outside 0-50 -> Invalid Data, recommended water N/A, Check reading
3. Moisture below target_min -> Dry, recommended water = normal_water, Water crop
4. Moisture inside the target range including boundaries -> Healthy, recommended water 0 L, Monitor
5. Moisture above target_max -> Too Wet, recommended water 0 L, Stop watering

For valid Online readings, temperature above 35 C adds High temperature and rainfall of at least 5 mm adds Rain detected.

Overall Farm Status priority is:
- No Crops when there are no Crop Cards
- Sensor Feed Unavailable when Crop Cards exist but no sensor request has ever succeeded
- Critical when any card has Sensor Problem or Invalid Data
- Watch when any card is Dry, Too Wet, or has High temperature
- otherwise Normal

## Final AI prompt used for the sensor readings

Generate a valid JSON array containing exactly 20 simulated SmartFarm sensor readings.
Use these crop_name values exactly and create exactly 5 readings for each:
Tomato, Lettuce, Wheat, Maize.
Every object must contain exactly these fields:
crop_name, timestamp, soil_moisture, temperature, rainfall, sensor_status, notes.
Use timestamps in YYYY-MM-DDTHH:mm:ss format. Timestamps must be distinct within each crop. The same timestamp may be used by different crops. Mix the array order so the latest reading is not always the last object.
Use sensor_status only as Online, Offline or Faulty. Most numeric values must be realistic: soil_moisture 0-100, temperature 0-50, rainfall 0-50. Include exactly one structurally valid older reading with one deliberately out-of-range numeric value. That invalid reading must not be the latest reading for its crop.
Make the latest readings produce these cases with the default Crop Card settings:
- latest Tomato: Online, Dry, temperature above 35 C
- latest Lettuce: Online and Healthy
- latest Wheat: Online, Too Wet, rainfall at least 5 mm
- latest Maize: sensor_status Faulty
Return only the JSON array. Do not use Markdown or explanation.

## AI use and corrections made

## AI Use

I used ChatGPT mainly as a support tool while developing the project.

I used it to help find mistakes in my code, correct errors, explain parts of React and backend code that I was unsure about, and help with some CSS formatting.

I also used it to review whether parts of my implementation matched the assignment requirements and to help check the sensor data.

I reviewed the suggestions before applying them and made the final implementation decisions myself.

During testing and review, I found a few issues that needed to be corrected.

The latest Lettuce sensor reading originally had a soil moisture value of 50. Since the Lettuce target range is 60 to 80, this caused it to be classified as Dry instead of Healthy. I changed the value to 65 so the latest Lettuce reading produces the required Healthy condition.

I also corrected the sensor validation so that structural errors cause the whole sensor file to be rejected instead of filtering out invalid readings.

Other small corrections included making duplicate crop names return HTTP 409, preventing crop_name from being changed during Edit, and returning the required JSON response after deleting a Crop Card.

## Limitation

The sensor feed is a static local JSON file that simulates IoT data. The application does not connect to real sensors or a live cloud/MQTT service.
# Pilar360 — quick defense guide

## 1. What is Pilar360?

Pilar360 is a web-based community issue reporting and tracking prototype for Barangay Marifosque, Pilar, Sorsogon. It demonstrates how a resident can submit a community concern and check the status saved in the system.

## 2. What problem does it address?

Residents may report concerns by visiting the Barangay Hall, talking to barangay officials or tanods, or sending messages through social media. The project explores an additional digital option where a resident can receive a report ID and check the status recorded in the demo.

Do not claim that all residents experience tracking problems unless your survey results support that statement.

## 3. Who are the users?

- **Reporter:** enters a display name, submits an issue, and checks the report ID/status. The name is user-entered and is not identity-verified.
- **Authority demo user:** signs in, reviews reports, sees the reporter and location, views map pins, and updates the demo status.

## 4. Basic demonstration flow

1. Open the public portal.
2. Enter a sample reporter name, issue title, category, description, and landmark.
3. Optionally add coordinates or a photo. Use fictional sample information during a public class demonstration.
4. Submit and show the generated report ID.
5. Open the status tracker and search using that report ID.
6. Open `/admin` and enter the configured demo password.
7. Open Issue Reports to show the reporter name and location.
8. Open Community Map to show reports with coordinates.
9. Open a report, change its demo status, and add a short update note.
10. Return to the public tracker and show the updated timeline.

## 5. How does the map work?

The browser receives the report's latitude and longitude. The authority map uses Leaflet and OpenStreetMap tiles to show pins. The reporter-entered name and coordinates are not independently verified. Only reports with both coordinates appear on the map. The map tiles need internet, but the report list and entered landmark can still be viewed without map tiles.

## 6. What technology is used?

- HTML for the page structure.
- CSS for the responsive design on phones, tablets, laptops, and desktop computers.
- JavaScript for form validation, page interaction, map pins, and API requests.
- Node.js for the server and API.
- JSON file for the prototype's saved report records.
- Leaflet and OpenStreetMap for the optional interactive map.

## 7. Important limitations

Pilar360 is not an official LGU system. It does not automatically send reports to barangay officials and does not guarantee that a reported concern will be repaired. The password gate is a classroom demo control, not production-grade security. The prototype needs official permission, stronger security, reliable storage, and privacy review before real community use.

## 8. Sample explanation you can say

“Our project is Pilar360. It is a web-based prototype that focuses on Barangay Marifosque. We separated the system into two sides. The public side is for residents who want to submit a concern and check its status using a report ID. The authority side is password-protected and is used to review the submitted reports, see the reporter and location, view map pins, and update the status in the demo. We made the system responsive so it can be opened on mobile phones and computers. It is only a student prototype and is not connected to the barangay or municipal government.”

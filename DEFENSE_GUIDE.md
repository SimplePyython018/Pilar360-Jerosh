# Pilar360 — simple defense guide (Version 2.2)

## 1. What is Pilar360?

Pilar360 is a web-based community issue reporting and tracking prototype made by Jerosh Nevado, a Grade 12 ICT student. It focuses on Barangay Marifosque, Pilar, Sorsogon. It demonstrates how a resident can submit a concern, receive a report ID, and check the status saved in the demo.

## 2. What problem does it address?

Residents may share concerns by visiting the Barangay Hall, talking to barangay officials or tanods, or using social media. This project explores an additional digital option where a resident can save a report and check its recorded status using a report ID.

Do not claim that all residents experience tracking problems unless actual survey results support that statement.

## 3. Who uses the system?

- **Reporter:** fills in the concern, enters the barangay, adds a landmark or optional map pin, submits the form, and keeps the report ID.
- **Authority demo user:** signs in with the demo password, views the private report inbox, sees reporter details and reported location, opens the map, and updates the demo status.

## 4. Easy demonstration flow

1. Open `https://pilar360-jerosh.onrender.com/`. This is the introduction page.
2. Say: “I am Jerosh Nevado, a Grade 12 ICT student. I developed Pilar360 as a demonstration prototype for my project proposal.”
3. Tap **Explore Pilar360**.
4. Enter a sample reporter name, issue title, category, and description. Type or select **Marifosque** in the Barangay field.
5. Tap the map to place a pin, or use device location. You may also type coordinates or enter a nearby landmark. Use fictional sample details during a public class demo.
6. Submit and show the generated report ID.
7. Use **Check report status** to search for that ID.
8. Open **Authority access** and enter the password configured in Render.
9. Open Issue Reports, select the new report, and show reporter details, the location/landmark, coordinates, and map preview.
10. Change the status and save a short demo update.
11. Tap **Sign out**. Choose “Yes, sign out” to end the session and return to the public report page. Choose “No, stay here” to remain in the authority workspace.

## 5. How does the map work?

The reporter must provide either a nearby landmark or a map pin. A map pin can be placed by tapping the map, using device location (with permission), or typing latitude and longitude. The authority side reads those saved coordinates and displays a map pin. If no coordinates were saved, the detail page shows the landmark and explains that no map pin is available. Leaflet and OpenStreetMap map tiles need an internet connection. Coordinates are user-provided and are not independently verified.

## 6. What technology is used?

- **HTML** — page structure.
- **CSS** — responsive layout for phones and computers.
- **JavaScript** — form validation, map selection, and page interaction.
- **Node.js** — server and API.
- **JSON file** — demo report storage.
- **Leaflet + OpenStreetMap** — interactive location maps.

## 7. What are the limitations?

Pilar360 is not an official LGU system. It does not automatically send reports to barangay officials, and it cannot guarantee a response or repair. The map needs internet. Data stored on a free hosting instance may be lost after a restart or redeploy. The authority password is only a classroom demo gate, not a full production account system.

## 8. Simple explanation to memorize

“Our project is Pilar360. I am Jerosh Nevado, a Grade 12 ICT student, and I developed this as a demonstration prototype for my project proposal. It focuses on Barangay Marifosque. The public side allows a resident to submit a concern, add a location, receive a report ID, and check its status. The authority side is password-protected. It allows the demo authority user to review reports, see the reporter and location, view map pins, and update the status. This is only a student prototype and is not connected to the barangay or municipal government.”


## Easy demonstration script (v2.2)

1. Open the project introduction page and introduce yourself as Jerosh Nevado, Grade 12 ICT.
2. Select **Explore Pilar360** to open the public report portal.
3. Submit a fictional sample issue, choose/type Marifosque, and add a nearby landmark or map pin. A photo is optional.
4. Copy the generated demo report ID and use **Check report status**.
5. Open **Authority access**, enter the password stored in Render Environment Variables, then open **Issue reports**.
6. Tap **View report details**. Explain the reporter name, issue information, photo placeholder/photo, location map or missing-location notice, timeline, and status controls.
7. Change the sample status and save.
8. Select **Sign out**. Choose **Yes, sign out** to return to the public report portal, or **No, stay here** to remain in authority.

Keep the explanation simple: “The resident submits a concern and receives a demo report ID. The authority user can view the submitted details and update the demo status. The resident can use the report ID to check that status.”

Reminder: use fictional sample data for a classroom demo. This prototype does not send reports to barangay officials or guarantee a real-world response.

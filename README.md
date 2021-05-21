# groceries.py

Automates the process of adding items to a grocery list.

## Overview

Spreadsheets are managed in Google sheets which contain a record of meals and their corresponding ingredients among other data. The program takes a set of meals and uses Google's Docs/Sheets API to read the ingredients from the Google sheet and write all of those meal's ingredients into the Google doc grocery list. The grocery items are organized in the Google doc grocery list by section (fruits/vegetables, meat, dairy, etc.).

### Custom features
* Reminders section in grocery list that contains reminders such as when to thaw meat, etc.
<img width="632" alt="Screen Shot 2021-05-21 at 4 48 09 PM" src="https://user-images.githubusercontent.com/73859721/119207947-042d5b80-ba55-11eb-8af8-1159807aec93.png">

* Extra ingredients grocery list section for ingredients that may or may not be needed every time (salt, oil, spices, etc.)
<img width="633" alt="Screen Shot 2021-05-21 at 4 48 49 PM" src="https://user-images.githubusercontent.com/73859721/119207952-0c859680-ba55-11eb-8b20-a5206b671832.png">

* Meal abbereviations are added next to each ingredient item so you know what meal the ingredients on the grocery list corresponds to
<img width="633" alt="Screen Shot 2021-05-21 at 4 49 47 PM" src="https://user-images.githubusercontent.com/73859721/119207960-16a79500-ba55-11eb-81bc-b9104bbb2817.png">

* Keeps track of when meals were made on the meals Google sheet
<img width="524" alt="Screen Shot 2021-05-21 at 4 52 05 PM" src="https://user-images.githubusercontent.com/73859721/119207963-1b6c4900-ba55-11eb-9b03-b09d04595464.png">

# groceries.py

Automates the process of adding items to a grocery list.

## Overview

Spreadsheets are managed in Google sheets which contain a record of meals and their corresponding ingredients among other data. The program takes a set of meals and uses Google's Docs/Sheets API to read the ingredients from the Google sheet and write all of those meal's ingredients into the Google doc grocery list. The grocery items are organized in the Google doc grocery list by section (fruits/vegetables, meat, dairy, etc.).

### Custom features
* Reminders section in grocery list that contains reminders such as when to thaw meat, etc.
* Extra ingredients grocery list section for ingredients that may or may not be needed every time (salt, oil, spices, etc.)
* Meal abbereviations are added next to each ingredient item so you know what meal the ingredients on the grocery list corresponds to
* Keeps track of when meals were made on the meals Google sheet

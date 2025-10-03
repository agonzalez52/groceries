#
# Version 3.0.0
#
# Created By: Angel Gonzalez
#

import sys
import io
import os
sys.path.append('helpers')
import meal_grocery_updates as grc
import meal_components as mc
import google_office as goffice
import color_codes as colors
from datetime import date
from fastapi import FastAPI
from pydantic import BaseModel, field_validator
from typing import List, Optional
from contextlib import redirect_stdout
from dotenv import load_dotenv

load_dotenv()
GDOC_ID_PROD = os.getenv("GDOC_ID_PROD")
GSHEET_ID_PROD = os.getenv("GSHEET_ID_PROD")
GDOC_ID_DEV = os.getenv("GDOC_ID_DEV")
GSHEET_ID_DEV = os.getenv("GSHEET_ID_DEV")
MY_CALENDAR_GMAIL = os.getenv("MY_CALENDAR_GMAIL")

# Input schema for API request
class GroceryRunInput(BaseModel):
    date: date
    meal_ids: List[int]
    @field_validator("meal_ids", mode="before")
    def parse_meal_ids(cls, ids_input):
        if isinstance(ids_input, str):
            return [int(id.strip()) for id in ids_input.split(",")]
    first_week: bool
    class Flags(BaseModel):
        reminders_only: bool = False
        checklist: bool = True
        test: bool = False
    options: Optional[Flags] = Flags()

# Convert terminal output to API response
def terminal_to_api_output(update_groceries_func, *args):
    buffer = io.StringIO()
    with redirect_stdout(buffer):  # captures everything script prints
        update_groceries_func(*args)  # run main function
    logs = buffer.getvalue().splitlines()
    return logs

app = FastAPI()

# FastAPI endpoint to run groceries script
@app.post("/run")
def run_grocery_script(data: GroceryRunInput):
    if data.options.test is True:
        doc_id = GDOC_ID_DEV # Test sheet
        sheet_id = GSHEET_ID_DEV # Test sheet
    else:
        doc_id = GDOC_ID_PROD
        sheet_id = GSHEET_ID_PROD
    
    if data.first_week is True:
        font_color = colors.FONT_RED
    else:
        font_color = colors.FONT_PURPLE

    # Build Google services
    doc_service, sheet_service, calendar_service, mail_service = goffice.build_services()
    gdoc = goffice.GoogleDoc(doc_id, doc_service)
    gsheet = goffice.GoogleSheet(sheet_id, sheet_service)
    gcalendar = goffice.GoogleCalendar(MY_CALENDAR_GMAIL, calendar_service)
    gmail = goffice.GoogleMail(mail_service)
    gapi = goffice.GoogleAPI(gdoc, gsheet, gcalendar, gmail)

    meal_batch = mc.MealBatch(data.date, data.meal_ids)
    gapi.gdoc.set_font_color(font_color)
    logs = terminal_to_api_output(grc.update_grocery_list, meal_batch, gapi, data.options.reminders_only, data.options.checklist)
    return {"status": "complete", "logs": logs, "message": "done =) \"Have a lovely day!"}
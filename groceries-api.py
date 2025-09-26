#
# Version 2.1.0
#
# Created By: Angel Gonzalez
#

import sys
import io
sys.path.append('helpers')
import groceries_module as grc
import gdocs_module as gdocs
import font_colors as fc
from datetime import date
from fastapi import FastAPI
from pydantic import BaseModel, field_validator
from typing import List, Optional
from contextlib import redirect_stdout

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

def terminal_to_api_output(update_groceries_func, *args):
    buffer = io.StringIO()
    with redirect_stdout(buffer):  # captures everything script prints
        update_groceries_func(*args)  # run main function
    logs = buffer.getvalue().splitlines()
    return logs

app = FastAPI()

angel_calendar_id = 'angelmg58@gmail.com'

@app.post("/run")
def run_grocery_script(data: GroceryRunInput):
    if data.options.test is True:
        doc_id = "13NY4wB-BJ-FasWhN7DaM8rIf7l1RRKgXiK-a-ECIeKs" # Test sheet
        sheet_id = "1xd5yKYL3Ri5TWH17hIMApD4C7fOPcRHr2PK-63AsA_E" # Test sheet
    else:
        doc_id = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"
        sheet_id = "1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU"
    
    if data.first_week is True:
        font_color = fc.COLOR_RED
    else:
        font_color = fc.COLOR_PURPLE

    # Build Google services
    doc_service, sheet_service, calendar_service, mail_service = gdocs.build_services()
    gdoc = gdocs.GoogleDoc(doc_id, doc_service)
    gsheet = gdocs.GoogleSheet(sheet_id, sheet_service)
    gcalendar = gdocs.GoogleCalendar(angel_calendar_id, calendar_service)
    gmail = gdocs.GoogleMail(mail_service)
    gapi = gdocs.GoogleAPI(gdoc, gsheet, gcalendar, gmail)

    meal_batch = grc.MealBatch(data.date, data.meal_ids)
    gapi.gdoc.set_font_color(font_color)
    logs = terminal_to_api_output(grc.update_grocery_list, meal_batch, gapi, data.options.reminders_only, data.options.checklist)
    return {"status": "complete", "logs": logs, "message": "done =) \"Have a lovely day!"}
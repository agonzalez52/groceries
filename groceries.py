#
# Version 1.2.1
#
# Created By: Angel Gonzalez
#

import sys
sys.path.append('helper_functions')
import groceries_funcs as gf
import gdocs_funcs as gfuncs
from datetime import date
from datetime import datetime

def greeting():
    curr_hour = datetime.now().hour
    if curr_hour >= 0 and curr_hour < 12:
        print('\n\nGood Morning!\n\n')
    elif curr_hour >=12 and curr_hour < 17:
        print('\n\nGood Afternoon!\n\n')
    else:
        print('\n\nGood Evening!\n\n')

if __name__ == '__main__':
    greeting()

    doc_service, sheet_service = gfuncs.build_services()

    start_date = date(2021, 6, 7)
    gf.update_grocery_list([41,17,51,25,11,50], doc_service, sheet_service, start_date)
    #gf.make_reminders([12,41,13,24,37,1],doc_service,sheet_service,start_date)


    print('\n\ndone =) \"Have a lovely day!\"\n\n')

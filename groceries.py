#
# Version 1.2.1
#
# Created By: Angel Gonzalez
#

import sys
sys.path.append('helper_functions')
import groceries_funcs as grc
import gdocs_funcs as gfuncs
from datetime import date
from datetime import datetime

def greeting():
    curr_hour = datetime.now().hour
    if curr_hour >= 0 or curr_hour < 12:
        print('\n\nGood Morning!\n\n')
    elif cur_hour >=12 or curr_hour < 17:
        print('\n\nGood Afternoon!\n\n')
    else:
        print('\n\nGood Evening!\n\n')

if __name__ == '__main__':
    doc_service, sheet_service = gfuncs.build_services()
    # to create initial doc
    #doc = gfuncs.create_document(service)
    # for existing doc
    greeting()

    start_date = date(1980, 1, 4)
    grc.update_grocery_list([27,31,7], doc_service, sheet_service, start_date)
    #grc.make_reminders([12,41,13,24,37,1],doc_service,sheet_service,start_date)


    print('\n\ndone =) \"Have a lovely day!\"\n\n')

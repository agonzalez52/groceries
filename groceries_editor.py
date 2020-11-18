import json

'''
(1)Beans, rice, and cheese (~5 servings) B2
  ½-¾ 1 lb bag brown or black beans (¾-1 yellow thing)
  8/10 1 lb bag of rice (2 cups @ 1lb/2.5 cups)
  2 roma tomatos
  2 queso ranchero
  Extra: onion or onion powder, oregano, chicken flavor bouillon, salt, garlic powder, onion powder
  Notes: some extra stuff
'''
groceries = {}

groceries["Beans, rice and cheese (~5 servings)"] = []

groceries["Beans, rice and cheese (~5 servings)"].append({
    "ingredients":[["1/2-3/4 1lb bag brown or black beans (3/4-1 yellow thing)",
                    "rice, beans, etc."],
                   ["8/10 1 lb bag of rice (2 cups @ 1lb/2.5 cups)",
                   "rice, beans, ect."]],
    "id":"0001",
    "this_time":0,
    "last_time":1
})

with open('groceries.json','w') as outfile:
    json.dump(groceries, outfile)

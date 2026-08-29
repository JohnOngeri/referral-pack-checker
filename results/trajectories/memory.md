# Trajectory — per-facility memory

A local JSON store (`src/memory/store.json`) of how often each referring
facility has left a field out, across the packs it has sent. It never pre-fills
a value and never asserts anything about the current pack — when a facility has
a track record on a field, that field is moved to the top of the gap list as a
prompt to check.

## Store after the evaluation run (12 facilities)

### Ext 4 Clinic — 1 pack(s) seen
- bloodGroup: left out of 1 of 1

### Sithole PHC — 1 pack(s) seen
- haemoglobin: left out of 1 of 1

### Ikeja Health Post — 1 pack(s) seen
- haemoglobin: left out of 1 of 1

### Chatsworth Clinic — 1 pack(s) seen
- no omissions recorded

### Kibera Clinic — 1 pack(s) seen
- edd: left out of 1 of 1

### Chelstone PHC — 1 pack(s) seen
- antiD: left out of 1 of 1

### Ruaraka Clinic — 1 pack(s) seen
- haemoglobin: left out of 1 of 1

### Area 25 Clinic — 1 pack(s) seen
- parity: left out of 1 of 1

### Madina Clinic — 1 pack(s) seen
- no omissions recorded

### Kisumu West Clinic — 1 pack(s) seen
- no omissions recorded

### Tembisa Clinic — 1 pack(s) seen
- syphilisScreen: left out of 1 of 1

### Mzilikazi Clinic — 1 pack(s) seen
- gestationalAge: left out of 1 of 1
- edd: left out of 1 of 1

## Measured effect
Recall did not change when memory was added (Iteration 4 in the changelog).
Its only effect is ordering. Reported here whichever direction it went.

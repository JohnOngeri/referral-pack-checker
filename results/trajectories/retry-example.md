# Trajectory — extraction retry loop (case-03)

## Attempt 1
stop_reason: STOP
```
{
  "patientId": {
    "value": "8830",
    "absent": false,
    "provenance": {
      "quote": "PID 8830",
      "line": 1
    }
  },
  "ageYears": {
    "value": 24,
    "absent": false,
    "provenance": {
      "quote": "24",
      "line": 1
    }
  },
  "lmp": {
    "value": "2026-02-15",
    "absent": false,
    "provenance": {
      "quote": "LMP 15/02/2026",
      "line": 4
    }
  },
  "edd": {
    "value": "2026-11-22",
    "absent": false,
    "provenance": {
      "quote": "EDD 22/11/2026",
      "line": 4
    }
  },
  "gestationalAge": {
    "value": {
      "weeks": 24,
      "days": 3,
      "assessedOn": "2026-08-05",
      "provenance": {
        "quote": "GA 24+3 (05/08/26)",
        "line": 4
      }
    },
    "absent": false,
    "provenance": {
      "quote": "GA 24+3 (05/08/26)",
      "line": 4
    }
  },
  "gravidity": {
    "value": 1,
    "absent": false,
    "provenance": {
      "quote": "G1",
      "line": 5
    }
  },
  "parity": {
    "value": 0,
    "absent": false,
    "provenance": {
      "quote": "P0",
      "line": 5
    }
  },
  "bloodGroup": {
    "value": "B",
    "absent": false,
    "provenance": {
      "quote": "Blood gp B pos",
      "line": 10
    }
  },
  "rhesus": {
    "value": "positive",
    "absent": false,
    "provenance": {
      "quote": "pos",
      "line": 10
    }
  },
  "haemoglobin": {
    "value": null,
    "date": null,
    "absent": true,
    "provenance": {
      "quote": "Hb:  --",
      "line": 7
    },
    "
```

## Attempt 2
stop_reason: STOP
```
{
  "patientId": {
    "value": "8830",
    "absent": false,
    "provenance": {
      "quote": "PID 8830",
      "line": 1
    }
  },
  "ageYears": {
    "value": 24,
    "absent": false,
    "provenance": {
      "quote": "24",
      "line": 1
    }
  },
  "lmp": {
    "value": "2026-02-15",
    "absent": false,
    "provenance": {
      "quote": "LMP 15/02/2026",
      "line": 4
    }
  },
  "edd": {
    "value": "2026-11-22",
    "absent": false,
    "provenance": {
      "quote": "EDD 22/11/2026",
      "line": 4
    }
  },
  "gestationalAge": {
    "value": {
      "weeks": 24,
      "days": 3,
      "assessedOn": "2026-08-05",
      "provenance": {
        "quote": "GA 24+3 (05/08/26)",
        "line": 4
      }
    },
    "absent": false,
    "provenance": {
      "quote": "GA 24+3 (05/08/26)",
      "line": 4
    }
  },
  "gravidity": {
    "value": 1,
    "absent": false,
    "provenance": {
      "quote": "G1",
      "line": 5
    }
  },
  "parity": {
    "value": 0,
    "absent": false,
    "provenance": {
      "quote": "P0",
      "line": 5
    }
  },
  "bloodGroup": {
    "value": "B",
    "absent": false,
    "provenance": {
      "quote": "Blood gp B pos",
      "line": 10
    }
  },
  "rhesus": {
    "value": "positive",
    "absent": false,
    "provenance": {
      "quote": "Blood gp B pos",
      "line": 10
    }
  },
  "haemoglobin": {
    "value": null,
    "date": null,
    "absent": true,
    "provenance": {
      "quote": "Hb:  --",
      "line": 7
 
```

The validation error from each failed attempt is appended to the next
request. Capped at three attempts. Every attempt is committed under
results/raw/extract/case-03/.
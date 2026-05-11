// Base card pool with layered balance overrides appended below. Keep exports stable for main.js.
export const VICTORY_SCORE = 50;

export const LINES = [
  {
    "id": "frontline",
    "name": "前线区",
    "label": "前线",
    "role": "接敌、伏击、装甲推进、步兵阵地、直升机低空作战。"
  },
  {
    "id": "support",
    "name": "支援区",
    "label": "支援",
    "role": "远火、防空、无人机、巡航/弹道导弹、SEAD 战斗机与轰炸机协同。"
  }
];

export const FACTIONS = {
  "usa": {
    "id": "usa",
    "name": "美国战斗群",
    "shortName": "美国",
    "accent": "#6f9bd7",
    "doctrine": "精确协同、空地一体、优质单卡、保护高价值单位。"
  },
  "russia": {
    "id": "russia",
    "name": "俄罗斯战斗群",
    "shortName": "俄罗斯",
    "accent": "#c0564a",
    "doctrine": "装甲压迫、炮火饱和、火箭覆盖、防空纵深。"
  }
};

export const TYPE_LABELS = {
  "unit": "单位牌",
  "tactic": "战术牌",
  "strategy": "战略牌"
};

export const RARITY_LABELS = {
  "common": "1星",
  "uncommon": "2星",
  "rare": "3星",
  "epic": "4星",
  "legendary": "5星"
};

export const CARD_LIBRARY = {
  "us_marine_rifle": {
    "id": "us_marine_rifle",
    "faction": "usa",
    "name": "海军陆战队",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "uncommon",
    "specialization": "前线占位、步战协同",
    "tags": [
      "步兵"
    ],
    "effect": "【地面压制】：对敌方【步兵】造成 3 点伤害。【陆战协同】：若己方前线有【装甲】，本次伤害 +1。",
    "art": "us_marine_rifle",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "requiresAnyTag": [
        "步兵"
      ],
      "ownTagBonus": {
        "line": "frontline",
        "tag": "装甲",
        "amount": 1
      },
      "sourceExposes": true
    }
  },
  "us_javelin_team": {
    "id": "us_javelin_team",
    "faction": "usa",
    "name": "陶式反坦克组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "反装甲伏击、补刀坦克",
    "tags": [
      "步兵"
    ],
    "effect": "【反甲伏击】：对敌方前线地面单位造成 1 点伤害；若目标为【装甲】，改为 5 点。【前线伏击】：隐蔽部署后因敌方前线接敌被动发动时，本次伤害 +1。",
    "art": "us_caat",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 1,
      "requiresAnyTag": [
        "步兵",
        "装甲"
      ],
      "bonuses": [
        {
          "tag": "装甲",
          "amount": 5
        }
      ],
      "sourceExposes": true
    },
    "ambushBonus": 1
  },
  "us_stinger_team": {
    "id": "us_stinger_team",
    "faction": "usa",
    "name": "毒刺防空组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "前线反直升机",
    "tags": [
      "步兵"
    ],
    "effect": "【前线防空】：对敌方【直升机】造成 4 点伤害。【便携拦截】：敌方【直升机】打击己方前线单位时，伤害 -2，本单位暴露，一回合一次。",
    "art": "us_mshorad",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresAnyTag": [
        "直升机"
      ],
      "sourceExposes": true
    },
    "continuous": {
      "intercept": 2,
      "interceptTags": [
        "直升机"
      ],
      "protectLines": [
        "frontline"
      ]
    }
  },
  "us_rangers_target": {
    "id": "us_rangers_target",
    "faction": "usa",
    "name": "武装侦察队",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "rare",
    "specialization": "暴露隐蔽单位、近距突袭",
    "tags": [
      "步兵",
      "侦查"
    ],
    "effect": "【渗透侦察】：本单位不会因敌方前线接敌而暴露；使敌方一个隐蔽单位暴露。若目标在支援区，本单位也暴露。【近距突袭】：对一个暴露的【步兵】造成 3 点伤害。",
    "art": "us_rangers_rrc",
    "ability": {
      "kind": "exposeOrDamage",
      "exposeRows": [
        "frontline",
        "support"
      ],
      "damageRows": [
        "frontline"
      ],
      "damageIfExposed": 3,
      "damageIfTag": {
        "tag": "步兵",
        "amount": 3
      },
      "sourceExposes": true
    },
    "contactException": true
  },
  "us_marine_engineers": {
    "id": "us_marine_engineers",
    "faction": "usa",
    "name": "海军陆战突击队",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "rare",
    "specialization": "清步兵、摧毁后重新隐蔽",
    "tags": [
      "步兵"
    ],
    "effect": "【突击清剿】：对敌方前线【步兵】或已受损地面单位造成 4 点伤害。【快速脱离】：本单位摧毁目标后，可以重新进入隐蔽。",
    "art": "us_green_beret",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 4,
      "requiresAnyTag": [
        "步兵"
      ],
      "damagedAmount": 4,
      "sourceExposes": true
    }
  },
  "us_bradley": {
    "id": "us_bradley",
    "faction": "usa",
    "name": "布莱德利步兵战车",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "rare",
    "specialization": "前线交换、步兵掩护",
    "tags": [
      "装甲"
    ],
    "effect": "【伴随火力】：对敌方前线地面单位造成 3 点伤害；若目标为【步兵】或已受损，改为 4 点。【步兵掩护】：己方一个【步兵】受到【榴弹炮】或【火箭炮】伤害时，伤害 -1，一回合一次。",
    "art": "us_bradley",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "requiresAnyTag": [
        "步兵",
        "装甲"
      ],
      "bonuses": [
        {
          "tag": "步兵",
          "amount": 4
        }
      ],
      "damagedAmount": 4,
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": [
          "步兵"
        ],
        "sourceTags": [
          "榴弹炮",
          "火箭炮"
        ]
      }
    }
  },
  "us_m1a2": {
    "id": "us_m1a2",
    "faction": "usa",
    "name": "艾布拉姆斯主战坦克",
    "type": "unit",
    "line": "frontline",
    "power": 7,
    "rarity": "legendary",
    "specialization": "高质量地面交换",
    "tags": [
      "装甲"
    ],
    "effect": "【装甲突击】：对敌方地面单位造成 4 点伤害；若目标为【装甲】或已受损，改为 5 点。【协同推进】：己方前线有【步兵】时，本单位受到的下一次伤害 -1，一回合一次。",
    "art": "us_m1a2",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 4,
      "requiresAnyTag": [
        "步兵",
        "装甲"
      ],
      "bonuses": [
        {
          "tag": "装甲",
          "amount": 5
        }
      ],
      "damagedAmount": 5,
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetCards": [
          "us_m1a2"
        ],
        "requiresOwnTag": {
          "line": "frontline",
          "tag": "步兵"
        }
      }
    }
  },
  "us_m88": {
    "id": "us_m88",
    "faction": "usa",
    "name": "LAV-L后勤车",
    "type": "unit",
    "line": "support",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "战场补给",
    "tags": [
      "后勤"
    ],
    "effect": "【战场补给】：修复己方一个前线单位 2 点战力，随后本单位撤离。【补给中继】：若修复的是【装甲】，抽 1 张牌后弃 1 张牌。",
    "art": "us_fmtv",
    "ability": {
      "kind": "repair",
      "amount": 2,
      "requiresAnyTag": [
        "步兵",
        "装甲"
      ]
    }
  },
  "us_apache": {
    "id": "us_apache",
    "faction": "usa",
    "name": "阿帕奇武装直升机",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "epic",
    "specialization": "反装甲、低空压制",
    "tags": [
      "直升机"
    ],
    "effect": "【猎杀装甲】：对敌方【装甲】造成 5 点伤害；若目标为【直升机】，造成 4 点伤害。【低空支援】：敌方前线有单位时，本单位仍可隐蔽部署。",
    "art": "us_ah1z",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresAnyTag": [
        "装甲",
        "直升机"
      ],
      "bonuses": [
        {
          "tag": "装甲",
          "amount": 5
        }
      ],
      "sourceExposes": true
    }
  },
  "us_m109": {
    "id": "us_m109",
    "faction": "usa",
    "name": "帕拉丁榴弹炮",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "rare",
    "specialization": "稳定前线炮击",
    "tags": [
      "榴弹炮"
    ],
    "effect": "【远程炮击】：对敌方前线一个单位造成 3 点伤害；若目标为【步兵】或已受损，改为 4 点。发动后暴露。",
    "art": "us_m109",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "bonuses": [
        {
          "tag": "步兵",
          "amount": 4
        }
      ],
      "damagedAmount": 4,
      "sourceExposes": true
    },
    "fire": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "bonuses": [
        {
          "tag": "步兵",
          "amount": 4
        }
      ],
      "damagedAmount": 4,
      "sourceExposes": true
    }
  },
  "us_himars": {
    "id": "us_himars",
    "faction": "usa",
    "name": "M270火箭炮",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "rare",
    "specialization": "前线多目标压制",
    "tags": [
      "火箭炮"
    ],
    "effect": "【区域压制】：对敌方前线最多 2 个单位各造成 3 点伤害。发动后暴露。",
    "art": "us_m1064",
    "ability": {
      "kind": "areaDamage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "maxTargets": 2,
      "sourceExposes": true
    },
    "fire": {
      "kind": "areaDamage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "maxTargets": 2,
      "sourceExposes": true
    }
  },
  "us_atacms": {
    "id": "us_atacms",
    "faction": "usa",
    "name": "M270A2制导火箭炮",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "侦查配合后的高效收割",
    "tags": [
      "火箭炮"
    ],
    "effect": "【制导齐射】：对敌方最多 2 个暴露单位各造成 3 点伤害；若其中一个目标由【无人机】暴露，该目标伤害 +1。发动后暴露。",
    "art": "us_m1064",
    "ability": {
      "kind": "areaDamage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 3,
      "requiresExposed": true,
      "maxTargets": 2,
      "sourceExposes": true
    },
    "fire": {
      "kind": "areaDamage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 3,
      "requiresExposed": true,
      "maxTargets": 2,
      "sourceExposes": true
    }
  },
  "us_avenger": {
    "id": "us_avenger",
    "faction": "usa",
    "name": "复仇者防空车",
    "type": "unit",
    "line": "support",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "近程拦截",
    "tags": [
      "伴随防空"
    ],
    "effect": "【近程拦截】：敌方【直升机】或【战斗机】打击己方单位时，该次伤害 -2；若目标为【直升机】，同时对其造成 2 点伤害。本单位暴露，一回合一次。",
    "art": "us_avenger",
    "continuous": {
      "intercept": 2,
      "interceptTags": [
        "直升机",
        "战斗机"
      ],
      "counterDamage": 2,
      "protectLines": [
        "frontline",
        "support"
      ]
    }
  },
  "us_mshorad": {
    "id": "us_mshorad",
    "faction": "usa",
    "name": "M6后卫防空车",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "rare",
    "specialization": "前线野战防空",
    "tags": [
      "伴随防空"
    ],
    "effect": "【野战防空】：敌方【直升机】发动打击时，伤害 -3，并对其造成 2 点伤害。本单位暴露。【伴随推进】：己方前线有【装甲】时，本单位可隐蔽部署。",
    "art": "us_mshorad",
    "continuous": {
      "intercept": 3,
      "interceptTags": [
        "直升机"
      ],
      "counterDamage": 2,
      "protectLines": [
        "frontline",
        "support"
      ]
    }
  },
  "us_patriot": {
    "id": "us_patriot",
    "faction": "usa",
    "name": "爱国者防空导弹",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "反导、反空保护支援区",
    "tags": [
      "重型防空"
    ],
    "effect": "【远程拦截】：敌方【战斗机】【轰炸机】或【导弹】打击己方单位时，该次伤害 -3。本单位暴露，一回合一次。",
    "art": "us_patriot",
    "continuous": {
      "intercept": 3,
      "interceptTags": [
        "战斗机",
        "轰炸机",
        "导弹"
      ],
      "protectLines": [
        "frontline",
        "support"
      ]
    }
  },
  "us_gray_eagle": {
    "id": "us_gray_eagle",
    "faction": "usa",
    "name": "灰鹰无人机",
    "type": "unit",
    "line": "support",
    "power": 2,
    "rarity": "uncommon",
    "specialization": "暴露前线、火力校射",
    "tags": [
      "无人机"
    ],
    "effect": "【目标指示】：使敌方前线一个隐蔽单位暴露。【火力校射】：己方【榴弹炮】或【火箭炮】打击由本单位暴露的目标时，伤害 +1。",
    "art": "us_mq1c",
    "ability": {
      "kind": "expose",
      "rows": [
        "frontline"
      ],
      "hiddenOnly": true,
      "markAmount": 1,
      "sourceExposes": false
    }
  },
  "us_reaper": {
    "id": "us_reaper",
    "faction": "usa",
    "name": "全球鹰无人机",
    "type": "unit",
    "line": "support",
    "power": 2,
    "rarity": "rare",
    "specialization": "高空侦察",
    "tags": [
      "无人机"
    ],
    "effect": "【高空侦察】：查看敌方支援区一个隐蔽单位，可以选择使其暴露；若选择暴露，本单位也暴露。【战略视野】：查看牌库顶 2 张，保留 1 张，另一张置于牌库底。",
    "art": "us_rq170",
    "ability": {
      "kind": "expose",
      "rows": [
        "support"
      ],
      "hiddenOnly": true,
      "markAmount": 1,
      "sourceExposes": true
    }
  },
  "us_f15e": {
    "id": "us_f15e",
    "faction": "usa",
    "name": "F-15E攻击鹰战斗机",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "对地空袭、收割暴露目标",
    "tags": [
      "战斗机"
    ],
    "effect": "【对地空袭】：对敌方前线一个暴露单位造成 5 点伤害；若目标未受损，改为 4 点。可被防空拦截，发动后暴露。",
    "art": "us_f35",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 4,
      "requiresExposed": true,
      "damagedAmount": 5,
      "sourceExposes": true,
      "interceptByTags": [
        "伴随防空",
        "重型防空"
      ]
    },
    "fire": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 4,
      "requiresExposed": true,
      "damagedAmount": 5,
      "sourceExposes": true,
      "interceptByTags": [
        "伴随防空",
        "重型防空"
      ]
    }
  },
  "us_f35": {
    "id": "us_f35",
    "faction": "usa",
    "name": "F-35B隐身战斗机",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "制空与精确空袭",
    "tags": [
      "战斗机"
    ],
    "effect": "【精确空袭】：对一个暴露单位造成 5 点伤害，或对空中单位造成 6 点伤害。【隐身突防】：本单位第一次被【重型防空】拦截时，该次拦截的减伤少 1。",
    "art": "us_f35",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 5,
      "requiresExposedOrAnyTag": [
        "直升机",
        "战斗机",
        "轰炸机"
      ],
      "bonuses": [
        {
          "tag": "直升机",
          "amount": 6
        },
        {
          "tag": "战斗机",
          "amount": 6
        },
        {
          "tag": "轰炸机",
          "amount": 6
        }
      ],
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    },
    "fire": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 5,
      "requiresExposedOrAnyTag": [
        "直升机",
        "战斗机",
        "轰炸机"
      ],
      "bonuses": [
        {
          "tag": "直升机",
          "amount": 6
        },
        {
          "tag": "战斗机",
          "amount": 6
        },
        {
          "tag": "轰炸机",
          "amount": 6
        }
      ],
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    }
  },
  "us_b2": {
    "id": "us_b2",
    "faction": "usa",
    "name": "B-1B枪骑兵轰炸机",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "区域轰炸",
    "tags": [
      "轰炸机"
    ],
    "effect": "【区域轰炸】：选择敌方一个区域，对其中最多 2 个暴露单位各造成 4 点伤害。可被【重型防空】拦截，发动后暴露。",
    "art": "us_b2",
    "ability": {
      "kind": "areaDamage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresExposed": true,
      "maxTargets": 2,
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    },
    "fire": {
      "kind": "areaDamage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresExposed": true,
      "maxTargets": 2,
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    }
  },
  "us_stryker": {
    "id": "us_stryker",
    "faction": "usa",
    "name": "LAV-25A1侦察装甲车",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "rare",
    "specialization": "轻装甲侦查、清步兵",
    "tags": [
      "装甲",
      "侦查"
    ],
    "effect": "【快速突击】：对敌方【步兵】造成3点伤害。【机动掩护】：己方【步兵】受到【直升机】伤害时，伤害-1。",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "requiresAnyTag": [
        "步兵"
      ],
      "amount": 3,
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": [
          "步兵"
        ],
        "sourceTags": [
          "直升机"
        ]
      }
    },
    "art": "us_lav25"
  },
  "us_smoke_screen": {
    "id": "us_smoke_screen",
    "faction": "usa",
    "name": "烟幕掩护",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "前线单位重新隐蔽",
    "tags": [
      "战术",
      "掩护"
    ],
    "effect": "指定己方一个已暴露前线单位，使其重新进入隐蔽。本牌不提供减伤。",
    "art": "us_smoke",
    "ability": {
      "kind": "smoke",
      "rows": [
        "frontline"
      ],
      "hide": true
    }
  },
  "us_reposition": {
    "id": "us_reposition",
    "faction": "usa",
    "name": "阵地转移",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "支援单位重新隐蔽但延迟开火",
    "tags": [
      "战术",
      "机动"
    ],
    "effect": "指定己方一个已暴露的【榴弹炮】【火箭炮】【重型防空】或【无人机】，使其重新进入隐蔽；该单位下回合不能主动发动技能。",
    "art": "us_fmtv",
    "ability": {
      "kind": "smoke",
      "rows": [
        "support"
      ],
      "hide": true,
      "requiresAnyTag": [
        "榴弹炮",
        "火箭炮",
        "重型防空",
        "无人机"
      ]
    }
  },
  "us_battlefield_repair": {
    "id": "us_battlefield_repair",
    "faction": "usa",
    "name": "战地维修",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "修复 2 点，避免拖场过久",
    "tags": [
      "战术",
      "维修"
    ],
    "effect": "修复己方一个单位 2 点战力。",
    "art": "us_m88",
    "ability": {
      "kind": "repair",
      "amount": 2
    }
  },
  "us_emergency_supply": {
    "id": "us_emergency_supply",
    "faction": "usa",
    "name": "紧急补给",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "抽牌调度",
    "tags": [
      "战术",
      "补给"
    ],
    "effect": "抽 2 张牌，选择 1 张加入手牌，另一张置于牌库底。",
    "art": "us_fmtv",
    "ability": {
      "kind": "supply",
      "draw": 2,
      "keep": 1,
      "noTarget": true
    }
  },
  "us_electronic_suppression": {
    "id": "us_electronic_suppression",
    "faction": "usa",
    "name": "电子压制",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "rare",
    "specialization": "限制敌方隐蔽单位发动",
    "tags": [
      "战术",
      "电子战"
    ],
    "effect": "指定敌方一个隐蔽单位，该单位在其下回合不能主动发动技能；若该单位已经暴露，则改为其下次伤害 -1。",
    "art": "us_humvee_lras3",
    "ability": {
      "kind": "suppress",
      "rows": [
        "frontline",
        "support"
      ],
      "hiddenOnly": true
    }
  },
  "ru_motostrelki": {
    "id": "ru_motostrelki",
    "faction": "russia",
    "name": "近卫摩托化步兵",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "uncommon",
    "specialization": "前线压迫、炮火协同",
    "tags": [
      "步兵"
    ],
    "effect": "【地面压制】：对敌方【步兵】造成 3 点伤害。【炮火协同】：若己方支援区有【榴弹炮】或【火箭炮】，本次伤害 +1。",
    "art": "ru_motostrelki",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "requiresAnyTag": [
        "步兵"
      ],
      "ownAnyTagBonus": {
        "line": "support",
        "tags": [
          "榴弹炮",
          "火箭炮"
        ],
        "amount": 1
      },
      "sourceExposes": true
    }
  },
  "ru_kornet_team": {
    "id": "ru_kornet_team",
    "faction": "russia",
    "name": "短号反坦克组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "反装甲伏击",
    "tags": [
      "步兵"
    ],
    "effect": "【反甲伏击】：对敌方前线地面单位造成 1 点伤害；若目标为【装甲】，改为 5 点。【前线伏击】：隐蔽部署后因敌方前线接敌被动发动时，本次伤害 +1。",
    "art": "ru_kornet_t",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 1,
      "requiresAnyTag": [
        "步兵",
        "装甲"
      ],
      "bonuses": [
        {
          "tag": "装甲",
          "amount": 5
        }
      ],
      "sourceExposes": true
    },
    "ambushBonus": 1
  },
  "ru_igla_team": {
    "id": "ru_igla_team",
    "faction": "russia",
    "name": "针式防空组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "前线反直升机",
    "tags": [
      "步兵"
    ],
    "effect": "【前线防空】：对敌方【直升机】造成 4 点伤害。【便携拦截】：敌方【直升机】打击己方前线单位时，伤害 -2，本单位暴露，一回合一次。",
    "art": "ru_vdv_infantry",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresAnyTag": [
        "直升机"
      ],
      "sourceExposes": true
    },
    "continuous": {
      "intercept": 2,
      "interceptTags": [
        "直升机"
      ],
      "protectLines": [
        "frontline"
      ]
    }
  },
  "ru_spetsnaz_target": {
    "id": "ru_spetsnaz_target",
    "faction": "russia",
    "name": "VDV特种部队",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "epic",
    "specialization": "暴露目标、火力引导",
    "tags": [
      "步兵",
      "侦查"
    ],
    "effect": "【渗透作战】：本单位不会因敌方前线接敌而暴露。【坐标引导】：使敌方一个隐蔽单位暴露；己方下一个【榴弹炮】【火箭炮】或【导弹】打击该目标时，伤害 +1。若目标在支援区，本单位也暴露。",
    "art": "ru_spetsnaz_vmf",
    "ability": {
      "kind": "expose",
      "rows": [
        "frontline",
        "support"
      ],
      "hiddenOnly": true,
      "markAmount": 1,
      "sourceExposes": true
    },
    "contactException": true
  },
  "ru_marines": {
    "id": "ru_marines",
    "faction": "russia",
    "name": "海军步兵队",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "uncommon",
    "specialization": "两栖强攻",
    "tags": [
      "步兵"
    ],
    "effect": "【两栖强攻】：对敌方【步兵】造成 3 点伤害。【固守阵地】：己方一个前线地面单位受到【榴弹炮】或【火箭炮】伤害时，伤害 -1，一回合一次。",
    "art": "ru_marines",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "requiresAnyTag": [
        "步兵"
      ],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetLines": [
          "frontline"
        ],
        "targetTags": [
          "步兵",
          "装甲"
        ],
        "sourceTags": [
          "榴弹炮",
          "火箭炮"
        ]
      }
    }
  },
  "ru_vdv": {
    "id": "ru_vdv",
    "faction": "russia",
    "name": "VDV空降兵",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "rare",
    "specialization": "空降突入",
    "tags": [
      "步兵"
    ],
    "effect": "【空降突入】：使敌方前线一个隐蔽单位暴露。【快速接敌】：若目标已经暴露，可对其造成 3 点伤害。",
    "art": "ru_vdv_infantry",
    "ability": {
      "kind": "exposeOrDamage",
      "exposeRows": [
        "frontline"
      ],
      "damageRows": [
        "frontline"
      ],
      "damageIfExposed": 3,
      "sourceExposes": true
    }
  },
  "ru_bmp3m": {
    "id": "ru_bmp3m",
    "faction": "russia",
    "name": "BMP-3步兵战车",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "rare",
    "specialization": "步战火力、步兵掩护",
    "tags": [
      "装甲"
    ],
    "effect": "【步战火力】：对敌方前线地面单位造成 3 点伤害；若目标为【步兵】或已受损，改为 4 点。【步兵掩护】：己方一个【步兵】受到远火伤害时，伤害 -1，一回合一次。",
    "art": "ru_bmp3m",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "requiresAnyTag": [
        "步兵",
        "装甲"
      ],
      "bonuses": [
        {
          "tag": "步兵",
          "amount": 4
        }
      ],
      "damagedAmount": 4,
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": [
          "步兵"
        ],
        "sourceTags": [
          "榴弹炮",
          "火箭炮"
        ]
      }
    }
  },
  "ru_btr82": {
    "id": "ru_btr82",
    "faction": "russia",
    "name": "BTR-90装甲输送车",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "uncommon",
    "specialization": "机动压制",
    "tags": [
      "装甲"
    ],
    "effect": "【机动压制】：对敌方【步兵】造成 3 点伤害。【步兵运载】：己方一个【步兵】受到【榴弹炮】或【火箭炮】伤害时，伤害 -1，一回合一次。",
    "art": "ru_btr82at",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "requiresAnyTag": [
        "步兵"
      ],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": [
          "步兵"
        ],
        "sourceTags": [
          "榴弹炮",
          "火箭炮"
        ]
      }
    }
  },
  "ru_t90m": {
    "id": "ru_t90m",
    "faction": "russia",
    "name": "T-90M主战坦克",
    "type": "unit",
    "line": "frontline",
    "power": 7,
    "rarity": "legendary",
    "specialization": "装甲突击、推进暴露",
    "tags": [
      "装甲"
    ],
    "effect": "【突破射击】：对敌方地面单位造成 4 点伤害；若目标为【装甲】或已受损，改为 5 点。【装甲压迫】：本单位摧毁敌方单位后，可使敌方一个前线隐蔽单位暴露。",
    "art": "ru_t90m",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 4,
      "requiresAnyTag": [
        "步兵",
        "装甲"
      ],
      "bonuses": [
        {
          "tag": "装甲",
          "amount": 5
        }
      ],
      "damagedAmount": 5,
      "sourceExposes": true
    }
  },
  "ru_bmpt": {
    "id": "ru_bmpt",
    "faction": "russia",
    "name": "BMPT终结者支援车",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "epic",
    "specialization": "清步兵、护送装甲",
    "tags": [
      "装甲"
    ],
    "effect": "【火力清剿】：对敌方【步兵】造成 4 点伤害；若目标已受损，改为 5 点。【装甲护送】：己方一个【装甲】受到【步兵】伤害时，伤害 -1，一回合一次。",
    "art": "ru_bmpt",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 4,
      "requiresAnyTag": [
        "步兵"
      ],
      "damagedAmount": 5,
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": [
          "装甲"
        ],
        "sourceTags": [
          "步兵"
        ]
      }
    }
  },
  "ru_ka52_unit": {
    "id": "ru_ka52_unit",
    "faction": "russia",
    "name": "卡-52鳄鱼武装直升机",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "epic",
    "specialization": "低空反甲、补刀受损目标",
    "tags": [
      "直升机"
    ],
    "effect": "【低空突击】：对敌方【装甲】或【直升机】造成 4 点伤害；若目标已受损，伤害 +1。【火力压迫】：本单位对【装甲】造成伤害后，目标进入暴露。",
    "art": "ru_ka52",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresAnyTag": [
        "装甲",
        "直升机"
      ],
      "damagedBonus": 1,
      "sourceExposes": true
    }
  },
  "ru_2s19": {
    "id": "ru_2s19",
    "faction": "russia",
    "name": "姆斯塔榴弹炮",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "rare",
    "specialization": "稳定远火",
    "tags": [
      "榴弹炮"
    ],
    "effect": "【远程炮击】：对敌方前线一个单位造成 3 点伤害；若目标为【步兵】或已受损，改为 4 点。发动后暴露。",
    "art": "ru_2s19",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "bonuses": [
        {
          "tag": "步兵",
          "amount": 4
        }
      ],
      "damagedAmount": 4,
      "sourceExposes": true
    },
    "fire": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "bonuses": [
        {
          "tag": "步兵",
          "amount": 4
        }
      ],
      "damagedAmount": 4,
      "sourceExposes": true
    }
  },
  "ru_tornado_s": {
    "id": "ru_tornado_s",
    "faction": "russia",
    "name": "2S35联盟自行炮",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "高精炮击",
    "tags": [
      "榴弹炮"
    ],
    "effect": "【高精炮击】：对一个暴露单位造成 4 点伤害；若目标已受损，改为 5 点。发动后暴露。",
    "art": "ru_bereg",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresExposed": true,
      "damagedAmount": 5,
      "sourceExposes": true
    },
    "fire": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresExposed": true,
      "damagedAmount": 5,
      "sourceExposes": true
    }
  },
  "ru_tos1a": {
    "id": "ru_tos1a",
    "faction": "russia",
    "name": "TOS-1喷火火箭炮",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "epic",
    "specialization": "清前线步兵阵地",
    "tags": [
      "火箭炮"
    ],
    "effect": "【阵地焚压】：对敌方前线最多 2 个【步兵】各造成 3 点伤害；若目标处于隐蔽，先使其暴露，伤害改为 2 点。发动后暴露。",
    "art": "ru_bereg",
    "ability": {
      "kind": "areaDamage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "requiresAnyTag": [
        "步兵"
      ],
      "canRevealHidden": true,
      "hiddenAmount": 2,
      "maxTargets": 2,
      "sourceExposes": true
    },
    "fire": {
      "kind": "areaDamage",
      "rows": [
        "frontline"
      ],
      "amount": 3,
      "requiresAnyTag": [
        "步兵"
      ],
      "canRevealHidden": true,
      "hiddenAmount": 2,
      "maxTargets": 2,
      "sourceExposes": true
    }
  },
  "ru_iskander": {
    "id": "ru_iskander",
    "faction": "russia",
    "name": "伊斯坎德尔弹道导弹",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "斩首暴露支援单位",
    "tags": [
      "导弹"
    ],
    "effect": "【弹道打击】：对一个暴露的支援区单位造成 6 点伤害；若目标在前线，造成 5 点伤害。可被【重型防空】拦截。【发射撤离】：本单位发动后撤离。",
    "art": "ru_iskander",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 5,
      "requiresExposed": true,
      "bonuses": [
        {
          "tag": "榴弹炮",
          "amount": 6
        },
        {
          "tag": "火箭炮",
          "amount": 6
        },
        {
          "tag": "重型防空",
          "amount": 6
        },
        {
          "tag": "无人机",
          "amount": 6
        }
      ],
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    },
    "retreatAfterUse": true,
    "fire": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 5,
      "requiresExposed": true,
      "bonuses": [
        {
          "tag": "榴弹炮",
          "amount": 6
        },
        {
          "tag": "火箭炮",
          "amount": 6
        },
        {
          "tag": "重型防空",
          "amount": 6
        },
        {
          "tag": "无人机",
          "amount": 6
        }
      ],
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    }
  },
  "ru_pantsir": {
    "id": "ru_pantsir",
    "faction": "russia",
    "name": "道尔-M1防空系统",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "rare",
    "specialization": "野战防空",
    "tags": [
      "伴随防空"
    ],
    "effect": "【野战防空】：敌方【直升机】或【战斗机】打击己方单位时，伤害 -2；若目标为【直升机】，同时对其造成 2 点伤害。本单位暴露，一回合一次。",
    "art": "ru_pantsir",
    "continuous": {
      "intercept": 2,
      "interceptTags": [
        "直升机",
        "战斗机"
      ],
      "counterDamage": 2,
      "protectLines": [
        "frontline",
        "support"
      ]
    }
  },
  "ru_s300v": {
    "id": "ru_s300v",
    "faction": "russia",
    "name": "S-300V4防空导弹",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "legendary",
    "specialization": "纵深防空、反导",
    "tags": [
      "重型防空"
    ],
    "effect": "【远程拦截】：敌方【战斗机】【轰炸机】或【导弹】打击己方支援区单位时，该次伤害 -3。本单位暴露，一回合一次。【纵深防空】：本单位在场时，己方支援区单位受到重型空袭或导弹打击时可触发拦截保护。",
    "art": "ru_buk",
    "continuous": {
      "intercept": 3,
      "interceptTags": [
        "战斗机",
        "轰炸机",
        "导弹"
      ],
      "protectLines": [
        "support"
      ]
    }
  },
  "ru_orlan10": {
    "id": "ru_orlan10",
    "faction": "russia",
    "name": "前哨无人机",
    "type": "unit",
    "line": "support",
    "power": 2,
    "rarity": "uncommon",
    "specialization": "侦查暴露、炮兵校射",
    "tags": [
      "无人机"
    ],
    "effect": "【无人侦扫】：使敌方一个隐蔽单位暴露；若目标在支援区，本单位也暴露。【炮兵校射】：己方【榴弹炮】打击由本单位暴露的目标时，伤害 +1。",
    "art": "ru_forpost",
    "ability": {
      "kind": "expose",
      "rows": [
        "frontline",
        "support"
      ],
      "hiddenOnly": true,
      "markAmount": 1,
      "sourceExposes": true
    }
  },
  "ru_forpost": {
    "id": "ru_forpost",
    "faction": "russia",
    "name": "猎户座无人机",
    "type": "unit",
    "line": "support",
    "power": 3,
    "rarity": "rare",
    "specialization": "察打一体",
    "tags": [
      "无人机"
    ],
    "effect": "【察打一体】：使敌方前线一个隐蔽单位暴露；若目标已经暴露且为【步兵】或【无人机】，对其造成 2 点伤害。【目标指示】：己方【火箭炮】或【导弹】打击由本单位暴露的目标时，伤害 +1。",
    "art": "ru_forpost",
    "ability": {
      "kind": "exposeOrDamage",
      "exposeRows": [
        "frontline"
      ],
      "damageRows": [
        "frontline"
      ],
      "damageIfExposed": 2,
      "damageIfTag": {
        "tag": "无人机",
        "amount": 2
      },
      "sourceExposes": true
    }
  },
  "ru_su34": {
    "id": "ru_su34",
    "faction": "russia",
    "name": "Su-34战斗轰炸机",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "对地空袭",
    "tags": [
      "战斗机"
    ],
    "effect": "【对地空袭】：对敌方前线一个暴露地面单位造成 5 点伤害；若目标未受损，改为 4 点。可被防空拦截，发动后暴露。",
    "art": "ru_tu22m3",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 4,
      "requiresExposed": true,
      "damagedAmount": 5,
      "requiresAnyTag": [
        "步兵",
        "装甲"
      ],
      "sourceExposes": true,
      "interceptByTags": [
        "伴随防空",
        "重型防空"
      ]
    },
    "fire": {
      "kind": "damage",
      "rows": [
        "frontline"
      ],
      "amount": 4,
      "requiresExposed": true,
      "damagedAmount": 5,
      "requiresAnyTag": [
        "步兵",
        "装甲"
      ],
      "sourceExposes": true,
      "interceptByTags": [
        "伴随防空",
        "重型防空"
      ]
    }
  },
  "ru_su35": {
    "id": "ru_su35",
    "faction": "russia",
    "name": "Su-35S制空战斗机",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "制空、保护直升机",
    "tags": [
      "战斗机"
    ],
    "effect": "【精确空袭】：对空中单位造成 6 点伤害，或对一个暴露单位造成 4 点伤害。【制空反应】：敌方【战斗机】打击己方【直升机】或【轰炸机】时，可对其造成 3 点伤害，本单位暴露，一回合一次。",
    "art": "ru_tu22m3",
    "ability": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresExposedOrAnyTag": [
        "直升机",
        "战斗机",
        "轰炸机"
      ],
      "bonuses": [
        {
          "tag": "直升机",
          "amount": 6
        },
        {
          "tag": "战斗机",
          "amount": 6
        },
        {
          "tag": "轰炸机",
          "amount": 6
        }
      ],
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    },
    "fire": {
      "kind": "damage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresExposedOrAnyTag": [
        "直升机",
        "战斗机",
        "轰炸机"
      ],
      "bonuses": [
        {
          "tag": "直升机",
          "amount": 6
        },
        {
          "tag": "战斗机",
          "amount": 6
        },
        {
          "tag": "轰炸机",
          "amount": 6
        }
      ],
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    }
  },
  "ru_tu22m3": {
    "id": "ru_tu22m3",
    "faction": "russia",
    "name": "Tu-22M3轰炸机",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "纵深区域轰炸",
    "tags": [
      "轰炸机"
    ],
    "effect": "【纵深轰炸】：选择敌方一个区域，对其中最多 2 个暴露单位各造成 4 点伤害。可被【重型防空】拦截，发动后暴露。",
    "art": "ru_tu22m3",
    "ability": {
      "kind": "areaDamage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresExposed": true,
      "maxTargets": 2,
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    },
    "fire": {
      "kind": "areaDamage",
      "rows": [
        "frontline",
        "support"
      ],
      "amount": 4,
      "requiresExposed": true,
      "maxTargets": 2,
      "sourceExposes": true,
      "interceptByTags": [
        "重型防空"
      ]
    }
  },
  "ru_smoke_decoys": {
    "id": "ru_smoke_decoys",
    "faction": "russia",
    "name": "烟幕伪装",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "前线单位重新隐蔽",
    "tags": [
      "战术",
      "掩护"
    ],
    "effect": "指定己方一个已暴露前线单位，使其重新进入隐蔽。本牌不提供减伤。",
    "art": "ru_smoke_position",
    "ability": {
      "kind": "smoke",
      "rows": [
        "frontline"
      ],
      "hide": true
    }
  },
  "ru_reposition": {
    "id": "ru_reposition",
    "faction": "russia",
    "name": "阵地转移",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "支援单位重新隐蔽但延迟开火",
    "tags": [
      "战术",
      "机动"
    ],
    "effect": "指定己方一个已暴露的【榴弹炮】【火箭炮】【导弹】【重型防空】或【无人机】，使其重新进入隐蔽；该单位下回合不能主动发动技能。",
    "art": "ru_smoke_position",
    "ability": {
      "kind": "smoke",
      "rows": [
        "support"
      ],
      "hide": true,
      "requiresAnyTag": [
        "榴弹炮",
        "火箭炮",
        "导弹",
        "重型防空",
        "无人机"
      ]
    }
  },
  "ru_battlefield_repair": {
    "id": "ru_battlefield_repair",
    "faction": "russia",
    "name": "战场维修",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "修复 2 点，避免拖场过久",
    "tags": [
      "战术",
      "维修"
    ],
    "effect": "修复己方一个单位 2 点战力。",
    "art": "ru_reservisty",
    "ability": {
      "kind": "repair",
      "amount": 2
    }
  },
  "ru_ammo_supply": {
    "id": "ru_ammo_supply",
    "faction": "russia",
    "name": "弹药补给",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "抽牌调度",
    "tags": [
      "战术",
      "补给"
    ],
    "effect": "抽 2 张牌，选择 1 张加入手牌，另一张置于牌库底。",
    "art": "ru_reservisty",
    "ability": {
      "kind": "supply",
      "draw": 2,
      "keep": 1,
      "noTarget": true
    }
  },
  "ru_electronic_suppression": {
    "id": "ru_electronic_suppression",
    "faction": "russia",
    "name": "电子压制",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "rare",
    "specialization": "限制敌方隐蔽单位发动",
    "tags": [
      "战术",
      "电子战"
    ],
    "effect": "指定敌方一个隐蔽单位，该单位在其下回合不能主动发动技能；若该单位已经暴露，则改为其下次伤害 -1。",
    "art": "ru_ew_screen",
    "ability": {
      "kind": "suppress",
      "rows": [
        "frontline",
        "support"
      ],
      "hiddenOnly": true
    }
  }
};

const V43_CARD_OVERRIDES = {
  "us_javelin_team": {
    "id": "us_javelin_team",
    "faction": "usa",
    "name": "标枪反甲小组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "反装甲伏击",
    "tags": ["步兵"],
    "effect": "【反甲伏击】：对敌方前线地面单位造成 2 点伤害；若目标为【装甲】，改为 4 点。【前线伏击】：隐蔽部署后因敌方前线接敌被动发动打击时，伤害 +1。",
    "art": "us_caat",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 2,
      "requiresAnyTag": ["步兵", "装甲"],
      "bonuses": [{ "tag": "装甲", "amount": 4 }],
      "sourceExposes": true
    },
    "ambushBonus": 1
  },
  "us_stinger_team": {
    "id": "us_stinger_team",
    "faction": "usa",
    "name": "毒刺防空组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "前线反直升机",
    "tags": ["步兵"],
    "effect": "【前线防空】：对敌方【直升机】造成 4 点伤害。",
    "art": "us_mshorad",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresAnyTag": ["直升机"],
      "sourceExposes": true
    }
  },
  "us_rangers_target": {
    "id": "us_rangers_target",
    "faction": "usa",
    "name": "游骑兵渗透小组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "epic",
    "specialization": "渗透侦察、坐标引导",
    "tags": ["步兵", "侦查"],
    "effect": "【渗透作战】：本单位不会因敌方前线接敌而暴露。【坐标引导】：使敌方一个隐蔽单位进入暴露，己方一个【榴弹炮】或【火箭炮】可立即打击该目标。",
    "art": "us_rangers_rrc",
    "ability": {
      "kind": "exposeAndCallFire",
      "rows": ["frontline", "support"],
      "hiddenOnly": true,
      "callerTags": ["榴弹炮", "火箭炮"],
      "sourceExposes": true
    },
    "contactException": true
  },
  "us_green_beret": {
    "id": "us_green_beret",
    "faction": "usa",
    "name": "绿色贝雷帽引导组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "epic",
    "specialization": "支援区火力指示",
    "tags": ["步兵", "侦查"],
    "effect": "【渗透作战】：本单位不会因敌方前线接敌而暴露。【火力指示】：使敌方支援区一个隐蔽单位进入暴露。",
    "art": "us_green_beret",
    "ability": {
      "kind": "expose",
      "rows": ["support"],
      "hiddenOnly": true,
      "markAmount": 1,
      "sourceExposes": true
    },
    "contactException": true
  },
  "us_marine_engineers": {
    "id": "us_marine_engineers",
    "faction": "usa",
    "name": "海军陆战队工兵组",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "uncommon",
    "specialization": "固守阵地、前线协同",
    "tags": ["步兵"],
    "effect": "【固守阵地】：己方前线地面单位受到【榴弹炮】或【火箭炮】伤害时，伤害 -1。【前线协同】：己方步兵造成伤害时，本单位也发动攻击并造成 1 点伤害，一回合仅一次。",
    "art": "us_green_beret",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 1,
      "requiresAnyTag": ["步兵", "装甲"],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetLines": ["frontline"],
        "targetTags": ["步兵", "装甲"],
        "sourceTags": ["榴弹炮", "火箭炮"]
      }
    }
  },
  "us_bradley": {
    "id": "us_bradley",
    "faction": "usa",
    "name": "布莱德利步兵战车",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "rare",
    "specialization": "伴随火力、步兵掩护",
    "tags": ["装甲"],
    "effect": "【伴随火力】：对敌方前线地面单位造成 3 点伤害，若目标为【步兵】则造成 4 点伤害。【步兵掩护】：己方【步兵】受到【榴弹炮】或【火箭炮】伤害时，伤害 -1。",
    "art": "us_bradley",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 3,
      "requiresAnyTag": ["步兵", "装甲"],
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": ["步兵"],
        "sourceTags": ["榴弹炮", "火箭炮"]
      }
    }
  },
  "us_m1a2": {
    "id": "us_m1a2",
    "faction": "usa",
    "name": "艾布拉姆斯主战坦克",
    "type": "unit",
    "line": "frontline",
    "power": 7,
    "rarity": "legendary",
    "specialization": "装甲突击、协同推进",
    "tags": ["装甲"],
    "effect": "【装甲突击】：对敌方地面单位造成 4 点伤害，若目标为【装甲】则造成 5 点伤害。【协同推进】：若己方前线有【步兵】，本技能伤害上限提高至 5 点。",
    "art": "us_m1a2",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 4,
      "requiresAnyTag": ["步兵", "装甲"],
      "bonuses": [{ "tag": "装甲", "amount": 5 }],
      "ownTagBonus": { "line": "frontline", "tag": "步兵", "amount": 1, "cap": 5 },
      "sourceExposes": true
    }
  },
  "us_stryker": {
    "id": "us_stryker",
    "faction": "usa",
    "name": "斯特赖克机动装甲",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "uncommon",
    "specialization": "快速突击、机动掩护",
    "tags": ["装甲"],
    "effect": "【快速突击】：对敌方【步兵】造成 3 点伤害。【机动掩护】：己方【步兵】受到【直升机】伤害时，伤害 -1。",
    "art": "us_lav25",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "requiresAnyTag": ["步兵"],
      "amount": 3,
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": ["步兵"],
        "sourceTags": ["直升机"]
      }
    }
  },
  "us_apache": {
    "id": "us_apache",
    "faction": "usa",
    "name": "阿帕奇武装直升机",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "epic",
    "specialization": "空中打击、前线支援",
    "tags": ["直升机"],
    "effect": "【空中打击】：选择敌方一个【装甲】或【直升机】造成 5 点伤害。【前线支援】：敌方前线有单位时，本单位也可以隐蔽部署。",
    "art": "us_ah1z",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 5,
      "requiresAnyTag": ["装甲", "直升机"],
      "sourceExposes": true
    }
  },
  "us_m109": {
    "id": "us_m109",
    "faction": "usa",
    "name": "帕拉丁榴弹炮",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "rare",
    "specialization": "远程炮击",
    "tags": ["榴弹炮"],
    "effect": "【远程炮击】：对敌方前线一个单位造成 3 点伤害，若目标为【步兵】，改为 4 点。发动后暴露。",
    "art": "us_m109",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 3,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    },
    "fire": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 3,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    }
  },
  "us_mlrs": {
    "id": "us_mlrs",
    "faction": "usa",
    "name": "MLRS火箭炮",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "火力覆盖",
    "tags": ["火箭炮"],
    "effect": "【火力覆盖】：对敌方最多三个单位造成伤害，主目标 4 点，其余目标各 1 点。发动后暴露。",
    "art": "us_m1064",
    "ability": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "secondaryAmount": 1,
      "maxTargets": 3,
      "sourceExposes": true
    },
    "fire": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "secondaryAmount": 1,
      "maxTargets": 3,
      "sourceExposes": true
    }
  },
  "us_himars": {
    "id": "us_himars",
    "faction": "usa",
    "name": "海马斯火箭炮",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "epic",
    "specialization": "前线步兵覆盖",
    "tags": ["火箭炮"],
    "effect": "【火力覆盖】：对敌方前线最多两个【步兵】造成伤害，主目标 4 点，第二目标 2 点。发动后暴露。",
    "art": "us_m1064",
    "ability": {
      "kind": "areaDamage",
      "rows": ["frontline"],
      "amount": 4,
      "secondaryAmount": 2,
      "requiresAnyTag": ["步兵"],
      "maxTargets": 2,
      "sourceExposes": true
    },
    "fire": {
      "kind": "areaDamage",
      "rows": ["frontline"],
      "amount": 4,
      "secondaryAmount": 2,
      "requiresAnyTag": ["步兵"],
      "maxTargets": 2,
      "sourceExposes": true
    }
  },
  "us_avenger": {
    "id": "us_avenger",
    "faction": "usa",
    "name": "复仇者伴随防空",
    "type": "unit",
    "line": "support",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "近程拦截",
    "tags": ["伴随防空"],
    "effect": "【近程拦截】：对敌方【直升机】造成 3 点伤害；或使敌方【战斗机】打击战术牌伤害 -1。",
    "art": "us_avenger",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": ["直升机"],
      "sourceExposes": true
    },
    "continuous": {
      "intercept": 1,
      "interceptTags": ["战斗机"],
      "protectLines": ["frontline", "support"]
    }
  },
  "us_mshorad": {
    "id": "us_mshorad",
    "faction": "usa",
    "name": "M-SHORAD 机动防空",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "rare",
    "specialization": "野战防空",
    "tags": ["伴随防空"],
    "effect": "【野战防空】：对敌方【直升机】造成 4 点伤害；或使敌方【战斗机】打击战术牌伤害 -2。",
    "art": "us_mshorad",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresAnyTag": ["直升机"],
      "sourceExposes": true
    },
    "continuous": {
      "intercept": 2,
      "interceptTags": ["战斗机"],
      "protectLines": ["frontline", "support"]
    }
  },
  "us_patriot": {
    "id": "us_patriot",
    "faction": "usa",
    "name": "爱国者防空导弹",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "地空拦截、反导",
    "tags": ["重型防空"],
    "effect": "【地空打击】：敌方【战斗机】或【轰炸机】打击战术牌伤害 -3。【防空拦截】：敌方【导弹】打击战术牌伤害 -3，一回合仅一次。",
    "art": "us_patriot",
    "continuous": {
      "intercept": 3,
      "interceptTags": ["战斗机", "轰炸机", "导弹"],
      "protectLines": ["frontline", "support"]
    }
  },
  "us_reaper": {
    "id": "us_reaper",
    "faction": "usa",
    "name": "死神侦察无人机",
    "type": "unit",
    "line": "support",
    "power": 2,
    "rarity": "rare",
    "specialization": "无人侦扫、火力校射",
    "tags": ["无人机"],
    "effect": "【无人侦扫】：使敌方一个隐蔽单位进入暴露。【火力校射】：己方【榴弹炮】或【火箭炮】打击由本单位暴露的目标时，伤害 +1。",
    "art": "us_rq170",
    "ability": {
      "kind": "expose",
      "rows": ["frontline", "support"],
      "hiddenOnly": true,
      "markAmount": 1,
      "sourceExposes": true
    }
  },
  "us_gray_eagle": {
    "id": "us_gray_eagle",
    "faction": "usa",
    "name": "灰鹰侦察无人机",
    "type": "unit",
    "line": "support",
    "power": 2,
    "rarity": "uncommon",
    "specialization": "战场侦查、目标指示",
    "tags": ["无人机"],
    "effect": "【战场侦查】：查看牌库顶 2 张，选择 1 张加入手牌，其余放回牌库底。【目标指示】：使敌方前线一个隐蔽单位进入暴露。",
    "art": "us_mq1c",
    "ability": {
      "kind": "exposeAndSupply",
      "rows": ["frontline"],
      "hiddenOnly": true,
      "draw": 2,
      "keep": 1,
      "sourceExposes": false
    }
  },
  "us_atacms": {
    "id": "us_atacms",
    "faction": "usa",
    "name": "ATACMS 战术导弹",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "高伤害点杀暴露单位",
    "tags": ["导弹"],
    "effect": "【导弹打击】：对一个暴露单位造成 6 点伤害。可被一个【重型防空】单位拦截。",
    "art": "us_m1064",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 6,
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["重型防空"]
    }
  },
  "us_tomahawk": {
    "id": "us_tomahawk",
    "faction": "usa",
    "name": "战斧巡航导弹",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "支援区巡航打击",
    "tags": ["导弹"],
    "effect": "【巡航打击】：对一个暴露单位造成 5 点伤害；若目标在支援区，造成 6 点伤害。可被一个【重型防空】单位拦截。",
    "art": "us_m1064",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 5,
      "lineAmounts": { "support": 6 },
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["重型防空"]
    }
  },
  "us_f35": {
    "id": "us_f35",
    "faction": "usa",
    "name": "F-35 战斗机",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "制空与精确空袭",
    "tags": ["战斗机"],
    "effect": "【精确空袭】：对【直升机】造成 6 点伤害，或对一个暴露单位造成 4 点伤害。可被一个防空单位拦截。",
    "art": "us_f35",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresExposedOrAnyTag": ["直升机"],
      "bonuses": [{ "tag": "直升机", "amount": 6 }],
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"]
    }
  },
  "us_f15e": {
    "id": "us_f15e",
    "faction": "usa",
    "name": "F-15E 攻击机",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "前线对地空袭",
    "tags": ["战斗机"],
    "effect": "【对地空袭】：对敌方前线一个暴露单位造成 5 点伤害。可被一个防空单位拦截。",
    "art": "us_f35",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 5,
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"]
    }
  },
  "us_b2": {
    "id": "us_b2",
    "faction": "usa",
    "name": "B-2 隐身轰炸机",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "区域战略轰炸",
    "tags": ["轰炸机"],
    "effect": "【战略轰炸】：选择敌方一个区域内最多 2 个暴露单位，主目标造成 5 点伤害，第二目标造成 3 点伤害。可被一个【重型防空】单位拦截。",
    "art": "us_b2",
    "ability": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 5,
      "secondaryAmount": 3,
      "sameLineOnly": true,
      "requiresExposed": true,
      "maxTargets": 2,
      "sourceExposes": true,
      "interceptByTags": ["重型防空"]
    }
  },
  "us_reposition": {
    "id": "us_reposition",
    "faction": "usa",
    "name": "阵地转移",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "支援火力重新隐蔽",
    "tags": ["战术", "机动"],
    "effect": "指定己方一个已暴露的【榴弹炮】或【火箭炮】，使其重新进入隐蔽。",
    "art": "us_fmtv",
    "ability": {
      "kind": "smoke",
      "rows": ["support"],
      "hide": true,
      "requiresAnyTag": ["榴弹炮", "火箭炮"]
    }
  },
  "us_emergency_supply": {
    "id": "us_emergency_supply",
    "faction": "usa",
    "name": "紧急补给",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "抽牌调度",
    "tags": ["战术", "补给"],
    "effect": "抽 3 张牌，选择 1 张加入手牌，其余放回牌库底。",
    "art": "us_fmtv",
    "ability": {
      "kind": "supply",
      "draw": 3,
      "keep": 1,
      "noTarget": true
    }
  },
  "ru_kornet_team": {
    "id": "ru_kornet_team",
    "faction": "russia",
    "name": "短号反甲小组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "反装甲伏击",
    "tags": ["步兵"],
    "effect": "【反甲伏击】：对敌方前线地面单位造成 2 点伤害；若目标为【装甲】，改为 4 点。【前线伏击】：隐蔽部署后因敌方前线接敌被动发动打击时，伤害 +1。",
    "art": "ru_kornet",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 2,
      "requiresAnyTag": ["步兵", "装甲"],
      "bonuses": [{ "tag": "装甲", "amount": 4 }],
      "sourceExposes": true
    },
    "ambushBonus": 1
  },
  "ru_igla_team": {
    "id": "ru_igla_team",
    "faction": "russia",
    "name": "Igla 防空组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "uncommon",
    "specialization": "前线反直升机",
    "tags": ["步兵"],
    "effect": "【前线防空】：对敌方【直升机】造成 4 点伤害。",
    "art": "ru_igla",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresAnyTag": ["直升机"],
      "sourceExposes": true
    }
  },
  "ru_spetsnaz_target": {
    "id": "ru_spetsnaz_target",
    "faction": "russia",
    "name": "Spetsnaz 渗透小组",
    "type": "unit",
    "line": "frontline",
    "power": 3,
    "rarity": "epic",
    "specialization": "渗透侦察、坐标引导",
    "tags": ["步兵", "侦查"],
    "effect": "【渗透作战】：本单位不会因敌方前线接敌而暴露。【坐标引导】：使敌方一个隐蔽单位进入暴露，己方一个【榴弹炮】或【火箭炮】可立即打击该目标。",
    "art": "ru_spetsnaz_vmf",
    "ability": {
      "kind": "exposeAndCallFire",
      "rows": ["frontline", "support"],
      "hiddenOnly": true,
      "callerTags": ["榴弹炮", "火箭炮"],
      "sourceExposes": true
    },
    "contactException": true
  },
  "ru_bmp3m": {
    "id": "ru_bmp3m",
    "faction": "russia",
    "name": "BMP-3 步兵战车",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "rare",
    "specialization": "步战火力、步兵掩护",
    "tags": ["装甲"],
    "effect": "【伴随火力】：对敌方前线地面单位造成 3 点伤害；若目标为【步兵】则造成 4 点。【步兵掩护】：己方【步兵】受到【榴弹炮】或【火箭炮】伤害时，伤害 -1。",
    "art": "ru_bmp3m",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 3,
      "requiresAnyTag": ["步兵", "装甲"],
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": ["步兵"],
        "sourceTags": ["榴弹炮", "火箭炮"]
      }
    }
  },
  "ru_t90m": {
    "id": "ru_t90m",
    "faction": "russia",
    "name": "T-90M 主战坦克",
    "type": "unit",
    "line": "frontline",
    "power": 7,
    "rarity": "legendary",
    "specialization": "装甲突击",
    "tags": ["装甲"],
    "effect": "【装甲突击】：对敌方地面单位造成 4 点伤害。【突破推进】：若己方前线有【步兵】，伤害 +1。",
    "art": "ru_t90m",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 4,
      "requiresAnyTag": ["步兵", "装甲"],
      "ownTagBonus": { "line": "frontline", "tag": "步兵", "amount": 1, "cap": 5 },
      "sourceExposes": true
    }
  },
  "ru_bmpt": {
    "id": "ru_bmpt",
    "faction": "russia",
    "name": "BMPT 终结者支援车",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "epic",
    "specialization": "清步兵、护送装甲",
    "tags": ["装甲"],
    "effect": "【火力清剿】：对敌方【步兵】造成 4 点伤害。【装甲护送】：己方【装甲】受到【步兵】伤害时，伤害 -1。",
    "art": "ru_bmpt",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 4,
      "requiresAnyTag": ["步兵"],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": ["装甲"],
        "sourceTags": ["步兵"]
      }
    }
  },
  "ru_btr82": {
    "id": "ru_btr82",
    "faction": "russia",
    "name": "BTR-82A 装甲输送车",
    "type": "unit",
    "line": "frontline",
    "power": 4,
    "rarity": "uncommon",
    "specialization": "机动压制、步兵运载",
    "tags": ["装甲"],
    "effect": "【机动压制】：对敌方【步兵】造成 3 点伤害。【步兵运载】：己方【步兵】与本单位受到【榴弹炮】或【火箭炮】伤害时，伤害 -1。",
    "art": "ru_btr82at",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 3,
      "requiresAnyTag": ["步兵"],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": ["步兵", "装甲"],
        "sourceTags": ["榴弹炮", "火箭炮"]
      }
    }
  },
  "ru_ka52_unit": {
    "id": "ru_ka52_unit",
    "faction": "russia",
    "name": "卡-52 武装直升机",
    "type": "unit",
    "line": "frontline",
    "power": 5,
    "rarity": "epic",
    "specialization": "空中打击、前线支援",
    "tags": ["直升机"],
    "effect": "【空中打击】：选择敌方一个【装甲】或【直升机】造成 5 点伤害。【前线支援】：敌方前线有单位时，本单位也可以隐蔽部署。",
    "art": "ru_ka52",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 5,
      "requiresAnyTag": ["装甲", "直升机"],
      "sourceExposes": true
    }
  },
  "ru_2s19": {
    "id": "ru_2s19",
    "faction": "russia",
    "name": "姆斯塔榴弹炮",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "rare",
    "specialization": "远程炮击",
    "tags": ["榴弹炮"],
    "effect": "【远程炮击】：对敌方前线一个单位造成 3 点伤害，若目标为【步兵】，改为 4 点。发动后暴露。",
    "art": "ru_2s19",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 3,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    },
    "fire": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 3,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    }
  },
  "ru_tornado_s": {
    "id": "ru_tornado_s",
    "faction": "russia",
    "name": "Tornado-S 火箭炮",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "火力覆盖",
    "tags": ["火箭炮"],
    "effect": "【火力覆盖】：对敌方最多三个单位造成伤害，主目标 4 点，其余目标各 1 点。发动后暴露。",
    "art": "ru_bereg",
    "ability": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "secondaryAmount": 1,
      "maxTargets": 3,
      "sourceExposes": true
    },
    "fire": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "secondaryAmount": 1,
      "maxTargets": 3,
      "sourceExposes": true
    }
  },
  "ru_tos1a": {
    "id": "ru_tos1a",
    "faction": "russia",
    "name": "TOS-1A 火箭炮",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "前线步兵压制",
    "tags": ["火箭炮"],
    "effect": "【火力覆盖】：对敌方前线最多两个【步兵】造成伤害，主目标 4 点，第二目标 2 点。发动后暴露。",
    "art": "ru_bereg",
    "ability": {
      "kind": "areaDamage",
      "rows": ["frontline"],
      "amount": 4,
      "secondaryAmount": 2,
      "requiresAnyTag": ["步兵"],
      "maxTargets": 2,
      "sourceExposes": true
    },
    "fire": {
      "kind": "areaDamage",
      "rows": ["frontline"],
      "amount": 4,
      "secondaryAmount": 2,
      "requiresAnyTag": ["步兵"],
      "maxTargets": 2,
      "sourceExposes": true
    }
  },
  "ru_pantsir": {
    "id": "ru_pantsir",
    "faction": "russia",
    "name": "Pantsir-S1 伴随防空",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "rare",
    "specialization": "野战防空",
    "tags": ["伴随防空"],
    "effect": "【野战防空】：对敌方【直升机】造成 4 点伤害；或使敌方【战斗机】打击战术牌伤害 -2。",
    "art": "ru_pantsir",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresAnyTag": ["直升机"],
      "sourceExposes": true
    },
    "continuous": {
      "intercept": 2,
      "interceptTags": ["战斗机"],
      "protectLines": ["frontline", "support"]
    }
  },
  "ru_buk_m3": {
    "id": "ru_buk_m3",
    "faction": "russia",
    "name": "Buk-M3 防空导弹",
    "type": "unit",
    "line": "support",
    "power": 4,
    "rarity": "epic",
    "specialization": "中程防空、反导",
    "tags": ["重型防空"],
    "effect": "【防空拦截】：敌方【战斗机】、【轰炸机】或【导弹】打击战术牌伤害 -2，一回合仅一次。【区域防空】：本单位在场时，己方前线与支援区均可受到该拦截保护。",
    "art": "ru_buk",
    "continuous": {
      "intercept": 2,
      "interceptTags": ["战斗机", "轰炸机", "导弹"],
      "protectLines": ["frontline", "support"]
    }
  },
  "ru_s300v": {
    "id": "ru_s300v",
    "faction": "russia",
    "name": "S-300V 防空导弹",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "legendary",
    "specialization": "纵深防空、反导",
    "tags": ["重型防空"],
    "effect": "【防空拦截】：敌方【战斗机】、【轰炸机】或【导弹】打击战术牌伤害 -3，一回合仅一次。【纵深防空】：本单位在场时，己方前线与支援区均可受到该拦截保护。",
    "art": "ru_buk",
    "continuous": {
      "intercept": 3,
      "interceptTags": ["战斗机", "轰炸机", "导弹"],
      "protectLines": ["frontline", "support"]
    }
  },
  "ru_orlan10": {
    "id": "ru_orlan10",
    "faction": "russia",
    "name": "Orlan-10 侦查无人机",
    "type": "unit",
    "line": "support",
    "power": 2,
    "rarity": "uncommon",
    "specialization": "无人侦扫、炮兵校射",
    "tags": ["无人机"],
    "effect": "【无人侦扫】：使敌方一个隐蔽单位进入暴露。【炮兵校射】：己方【榴弹炮】打击由本单位暴露的目标时，伤害 +1。",
    "art": "ru_forpost",
    "ability": {
      "kind": "expose",
      "rows": ["frontline", "support"],
      "hiddenOnly": true,
      "markAmount": 1,
      "sourceExposes": true
    }
  },
  "ru_forpost": {
    "id": "ru_forpost",
    "faction": "russia",
    "name": "Forpost-R 侦查无人机",
    "type": "unit",
    "line": "support",
    "power": 3,
    "rarity": "rare",
    "specialization": "目标指示、远火校射",
    "tags": ["无人机"],
    "effect": "【目标指示】：使敌方一个隐蔽单位进入暴露。【火力校射】：己方【火箭炮】或【导弹】打击由本单位暴露的目标时，伤害 +1。",
    "art": "ru_forpost",
    "ability": {
      "kind": "expose",
      "rows": ["frontline", "support"],
      "hiddenOnly": true,
      "markAmount": 1,
      "sourceExposes": true
    }
  },
  "ru_kalibr": {
    "id": "ru_kalibr",
    "faction": "russia",
    "name": "口径巡航导弹",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "前线巡航打击",
    "tags": ["导弹"],
    "effect": "【巡航打击】：对一个暴露前线单位造成 6 点伤害。可被一个【重型防空】单位拦截。",
    "art": "ru_iskander",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 6,
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["重型防空"]
    }
  },
  "ru_iskander": {
    "id": "ru_iskander",
    "faction": "russia",
    "name": "伊斯坎德尔弹道导弹",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "高伤害点杀暴露单位",
    "tags": ["导弹"],
    "effect": "【弹道导弹】：对一个暴露单位造成 7 点伤害。可被一个【重型防空】单位拦截。",
    "art": "ru_iskander",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 7,
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["重型防空"]
    }
  },
  "ru_su35": {
    "id": "ru_su35",
    "faction": "russia",
    "name": "Su-35 战斗机",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "制空与精确空袭",
    "tags": ["战斗机"],
    "effect": "【精确空袭】：对【直升机】造成 6 点伤害，或对一个暴露单位造成 4 点伤害。可被一个防空单位拦截。",
    "art": "ru_tu22m3",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresExposedOrAnyTag": ["直升机"],
      "bonuses": [{ "tag": "直升机", "amount": 6 }],
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"]
    }
  },
  "ru_su34": {
    "id": "ru_su34",
    "faction": "russia",
    "name": "Su-34 战斗轰炸机",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "前线对地空袭",
    "tags": ["战斗机"],
    "effect": "【对地空袭】：对敌方前线一个暴露单位造成 5 点伤害。可被一个防空单位拦截。",
    "art": "ru_tu22m3",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 5,
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"]
    }
  },
  "ru_tu22m3": {
    "id": "ru_tu22m3",
    "faction": "russia",
    "name": "图-22M3 轰炸机",
    "type": "unit",
    "line": "support",
    "power": 6,
    "rarity": "legendary",
    "specialization": "区域战略轰炸",
    "tags": ["轰炸机"],
    "effect": "【战略轰炸】：选择敌方一个区域内最多 2 个暴露单位，主目标造成 5 点伤害，第二目标造成 3 点伤害。可被一个【重型防空】单位拦截。",
    "art": "ru_tu22m3",
    "ability": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 5,
      "secondaryAmount": 3,
      "sameLineOnly": true,
      "requiresExposed": true,
      "maxTargets": 2,
      "sourceExposes": true,
      "interceptByTags": ["重型防空"]
    }
  },
  "ru_reposition": {
    "id": "ru_reposition",
    "faction": "russia",
    "name": "阵地转移",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "支援火力重新隐蔽",
    "tags": ["战术", "机动"],
    "effect": "指定己方一个已暴露的【榴弹炮】或【火箭炮】，使其重新进入隐蔽。",
    "art": "ru_smoke_position",
    "ability": {
      "kind": "smoke",
      "rows": ["support"],
      "hide": true,
      "requiresAnyTag": ["榴弹炮", "火箭炮"]
    }
  },
  "ru_ammo_supply": {
    "id": "ru_ammo_supply",
    "faction": "russia",
    "name": "弹药补给",
    "type": "tactic",
    "line": "instant",
    "power": null,
    "rarity": "uncommon",
    "specialization": "抽牌调度",
    "tags": ["战术", "补给"],
    "effect": "抽 3 张牌，选择 1 张加入手牌，其余放回牌库底。",
    "art": "ru_reservisty",
    "ability": {
      "kind": "supply",
      "draw": 3,
      "keep": 1,
      "noTarget": true
    }
  }
};

const GROUND_TAGS = ["步兵", "装甲"];
const REAR_EQUIPMENT_TAGS = ["榴弹炮", "火箭炮", "伴随防空", "重型防空", "无人机"];
const LOW_AIR_TAGS = ["直升机", "无人机"];
const HIGH_AIR_TAGS = ["战斗机", "轰炸机"];
const MISSILE_TAGS = ["导弹", "巡航导弹", "弹道导弹", "SEAD导弹"];
const GROUND_OR_REAR_EQUIPMENT_TAGS = [...GROUND_TAGS, ...REAR_EQUIPMENT_TAGS];
const GROUND_OR_REAR_OR_LOW_AIR_TAGS = [...GROUND_TAGS, ...REAR_EQUIPMENT_TAGS, ...LOW_AIR_TAGS];

const V07_CARD_OVERRIDES = {
  "us_marine_rifle": {
    "effect": "【地面压制】：对一个合法地面目标造成 2 点伤害；若目标为【步兵】，改为 3 点。【陆战协同】：若己方前线有【装甲】，本次伤害 +1。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 2,
      "requiresAnyTag": GROUND_TAGS,
      "bonuses": [{ "tag": "步兵", "amount": 3 }],
      "ownTagBonus": { "line": "frontline", "tag": "装甲", "amount": 1 },
      "sourceExposes": true
    }
  },
  "us_javelin_team": {
    "effect": "【反甲伏击】：对一个合法地面目标造成 2 点伤害；若目标为【装甲】，改为 4 点；也可对【直升机】造成 2 点伤害。【前线伏击】：隐蔽部署后因前线接敌被动打击时，伤害 +1。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 2,
      "requiresAnyTag": ["步兵", "装甲", "直升机"],
      "bonuses": [{ "tag": "装甲", "amount": 4 }],
      "sourceExposes": true
    },
    "ambushBonus": 1
  },
  "us_stinger_team": {
    "effect": "【前线防空】：对一个合法低空目标造成 3 点伤害；若目标为【直升机】或【无人机】，改为 4 点。【单兵防空】：敌方【直升机】打击己方前线单位时，可暴露本单位，使该伤害 -1，一回合一次。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": LOW_AIR_TAGS,
      "bonuses": [
        { "tag": "直升机", "amount": 4 },
        { "tag": "无人机", "amount": 4 }
      ],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetLines": ["frontline"],
        "sourceTags": ["直升机"],
        "canReveal": true,
        "sourceExposes": true
      }
    }
  },
  "us_rangers_target": {
    "effect": "【渗透作战】：本单位不会因前线接敌而暴露。【坐标引导】：选择一个合法目标；若其隐蔽，使其暴露。若己方有本回合未行动的【榴弹炮】或【火箭炮】，可立即对该目标进行一次打击，发动后该火力单位暴露；若没有可用火力单位，抽 1 张牌。",
    "ability": {
      "kind": "exposeAndCallFire",
      "rows": ["frontline", "support"],
      "canRevealHidden": true,
      "allowExposedTargets": true,
      "callerTags": ["榴弹炮", "火箭炮"],
      "noCallerFallback": "draw",
      "fallbackDraw": 1,
      "sourceExposes": true
    },
    "contactException": true
  },
  "us_bradley": {
    "effect": "【伴随火力】：对一个合法地面目标造成 3 点伤害；若目标为【步兵】，改为 4 点；也可对低空目标造成 2 点伤害。【步兵掩护】：己方【步兵】受到【榴弹炮】或【火箭炮】伤害时，伤害 -1，一回合一次。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": [...GROUND_TAGS, ...LOW_AIR_TAGS],
      "bonuses": [
        { "tag": "步兵", "amount": 4 },
        { "tag": "直升机", "amount": 2 },
        { "tag": "无人机", "amount": 2 }
      ],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": ["步兵"],
        "sourceTags": ["榴弹炮", "火箭炮"]
      }
    }
  },
  "us_m1a2": {
    "effect": "【装甲突击】：对一个合法地面或后排装备目标造成 4 点伤害；若目标为【装甲】，改为 5 点；也可对【直升机】造成 1 点伤害。【协同推进】：若己方前线有【步兵】，本次地面伤害 +1，上限 5。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresAnyTag": [...GROUND_OR_REAR_EQUIPMENT_TAGS, "直升机"],
      "bonuses": [
        { "tag": "装甲", "amount": 5 },
        { "tag": "直升机", "amount": 1 }
      ],
      "ownTagBonus": { "line": "frontline", "tag": "步兵", "amount": 1, "cap": 5, "targetTags": GROUND_OR_REAR_EQUIPMENT_TAGS },
      "sourceExposes": true
    }
  },
  "us_stryker": {
    "effect": "【快速突击】：对一个合法地面或后排装备目标造成 2 点伤害；若目标为【步兵】，改为 3 点；也可对低空目标造成 1 点伤害。【机动掩护】：己方【步兵】受到【直升机】伤害时，伤害 -1，一回合一次。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 2,
      "requiresAnyTag": GROUND_OR_REAR_OR_LOW_AIR_TAGS,
      "bonuses": [
        { "tag": "步兵", "amount": 3 },
        { "tag": "直升机", "amount": 1 },
        { "tag": "无人机", "amount": 1 }
      ],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": ["步兵"],
        "sourceTags": ["直升机"]
      }
    }
  },
  "us_apache": {
    "effect": "【空中打击】：对一个合法地面、低空或后排装备目标造成 3 点伤害；若目标为【装甲】、【直升机】或【重型防空】，改为 5 点。【前线支援】：敌方前线有单位时，本单位也可以隐蔽部署。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": GROUND_OR_REAR_OR_LOW_AIR_TAGS,
      "bonuses": [
        { "tag": "装甲", "amount": 5 },
        { "tag": "直升机", "amount": 5 },
        { "tag": "重型防空", "amount": 5 }
      ],
      "sourceExposes": true
    }
  },
  "us_m109": {
    "effect": "【远程炮击】：对一个合法地面或后排装备目标造成 3 点伤害；若目标为【步兵】，改为 4 点。发动后暴露。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    },
    "fire": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    }
  },
  "us_himars": {
    "effect": "【火力覆盖】：选择一个合法区域，对其中最多两个合法地面或后排装备目标造成伤害；主目标 3 点，第二目标 1 点；若主目标为【步兵】，改为 4 点和 2 点。发动后暴露。",
    "ability": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "secondaryAmount": 1,
      "primaryTagSecondaryAmount": { "tag": "步兵", "amount": 2 },
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "maxTargets": 2,
      "sameLineOnly": true,
      "sourceExposes": true
    },
    "fire": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "secondaryAmount": 1,
      "primaryTagSecondaryAmount": { "tag": "步兵", "amount": 2 },
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "maxTargets": 2,
      "sameLineOnly": true,
      "sourceExposes": true
    }
  },
  "us_avenger": {
    "effect": "【近程拦截】：对一个合法低空或暴露高空目标造成 2 点伤害；若目标为【直升机】或【无人机】，改为 3 点。【伴随防空】：敌方【战斗机】或【巡航导弹】打击造成的伤害 -1，一回合一次；不能拦截【弹道导弹】。触发后暴露。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 2,
      "requiresAnyTag": [...LOW_AIR_TAGS, ...HIGH_AIR_TAGS],
      "requiresExposedForTags": HIGH_AIR_TAGS,
      "bonuses": [
        { "tag": "直升机", "amount": 3 },
        { "tag": "无人机", "amount": 3 }
      ],
      "sourceExposes": true
    },
    "continuous": {
      "intercept": 1,
      "interceptTags": ["战斗机", "巡航导弹"],
      "protectLines": ["frontline", "support"],
      "sourceExposes": true
    }
  },
  "us_patriot": {
    "effect": "【区域防空】：敌方【战斗机】、【轰炸机】、【巡航导弹】、【弹道导弹】或【SEAD导弹】打击造成的伤害 -3，一回合一次；触发后暴露。【雷达截击】：对一个暴露的高空或导弹目标造成 2 点伤害。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 2,
      "requiresAnyTag": [...HIGH_AIR_TAGS, ...MISSILE_TAGS],
      "requiresExposed": true,
      "sourceExposes": true
    },
    "continuous": {
      "intercept": 3,
      "interceptTags": ["战斗机", "轰炸机", "巡航导弹", "弹道导弹", "SEAD导弹"],
      "protectLines": ["frontline", "support"],
      "sourceExposes": true
    }
  },
  "us_reaper": {
    "effect": "【无人侦扫】：选择一个合法目标；若其隐蔽，使其暴露。【火力校射】：若本单位本次成功暴露目标，且己方有本回合未行动的【榴弹炮】或【火箭炮】，可立即调用其打击该目标，本次伤害 +1；若没有可用火力单位，抽 1 张牌。",
    "ability": {
      "kind": "exposeAndCallFire",
      "rows": ["frontline", "support"],
      "canRevealHidden": true,
      "allowExposedTargets": true,
      "callerTags": ["榴弹炮", "火箭炮"],
      "calledFireBonus": 1,
      "callFireRequiresFreshExpose": true,
      "noCallerFallback": "draw",
      "fallbackDraw": 1,
      "sourceExposes": true
    }
  },
  "us_atacms": {
    "name": "ATACMS 战术弹道导弹",
    "specialization": "弹道导弹点杀暴露单位",
    "effect": "【弹道打击】：对一个暴露的合法目标造成 6 点伤害；若目标为后排装备，改为 7 点。只能被【重型防空】拦截。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 6,
      "bonuses": [{ "tag": "榴弹炮", "amount": 7 }, { "tag": "火箭炮", "amount": 7 }, { "tag": "伴随防空", "amount": 7 }, { "tag": "重型防空", "amount": 7 }, { "tag": "无人机", "amount": 7 }],
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["重型防空"]
    }
  },
  "us_tomahawk": {
    "power": 4,
    "effect": "【巡航打击】：对一个暴露的合法目标造成 4 点伤害；若目标在支援区，改为 5 点。可被【伴随防空】或【重型防空】拦截。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "lineAmounts": { "support": 5 },
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"]
    }
  },
  "us_f35": {
    "name": "F-22 制空战斗机",
    "specialization": "制空与精确空袭",
    "effect": "【精确空袭】：对一个暴露的合法目标造成 4 点伤害；若目标为【直升机】或高空目标，改为 6 点。可被防空单位拦截。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresExposedOrAnyTag": ["直升机", ...HIGH_AIR_TAGS],
      "bonuses": [
        { "tag": "直升机", "amount": 6 },
        { "tag": "战斗机", "amount": 6 },
        { "tag": "轰炸机", "amount": 6 }
      ],
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"]
    }
  },
  "us_f35a_sead": {
    "id": "us_f35a_sead",
    "faction": "usa",
    "name": "F-35A SEAD 战斗机",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "反辐射压制、有限制空",
    "tags": ["战斗机", "SEAD", "SEAD导弹"],
    "effect": "【SEAD反辐射导弹】：对一个暴露的【重型防空】造成 5 点伤害。可被一个【重型防空】单位拦截。【有限制空】：对一个暴露的低空或高空目标造成 4 点伤害。可被防空单位拦截。",
    "art": "us_f35a_sead",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresAnyTag": [...LOW_AIR_TAGS, ...HIGH_AIR_TAGS, "重型防空"],
      "requiresExposed": true,
      "bonuses": [{ "tag": "重型防空", "amount": 5 }],
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"],
      "interceptByTagsByTargetTag": [{ "tag": "重型防空", "interceptByTags": ["重型防空"] }]
    }
  },
  "us_b2": {
    "effect": "【战略轰炸】：选择一个合法区域，对其中最多两个暴露的地面或后排装备目标造成伤害，主目标 5 点，第二目标 3 点。可被一个【重型防空】单位拦截。",
    "ability": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 5,
      "secondaryAmount": 3,
      "sameLineOnly": true,
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "requiresExposed": true,
      "maxTargets": 2,
      "sourceExposes": true,
      "interceptByTags": ["重型防空"]
    }
  },
  "us_smoke_screen": {
    "effect": "指定己方一个已暴露单位，使其重新进入隐蔽；若目标在前线，修复 1 点战力。",
    "ability": {
      "kind": "smoke",
      "rows": ["frontline", "support"],
      "hide": true,
      "repairIfLine": { "line": "frontline", "amount": 1 }
    }
  },
  "us_reposition": {
    "effect": "指定己方一个已暴露单位，使其重新进入隐蔽；若目标在支援区，修复 1 点战力。",
    "ability": {
      "kind": "smoke",
      "rows": ["frontline", "support"],
      "hide": true,
      "repairIfLine": { "line": "support", "amount": 1 }
    }
  },
  "us_battlefield_repair": {
    "effect": "修复己方一个单位 2 点战力；若己方没有受损单位，抽 2 张牌，选择 1 张加入手牌，其余放回牌库底。",
    "ability": {
      "kind": "repair",
      "rows": ["frontline", "support"],
      "amount": 2,
      "drawAlternative": 2,
      "keepAlternative": 1
    }
  },
  "us_emergency_supply": {
    "effect": "抽 3 张牌，选择 1 张加入手牌，其余放回牌库底。",
    "ability": {
      "kind": "supply",
      "draw": 3,
      "keep": 1,
      "noTarget": true
    }
  },
  "us_electronic_suppression": {
    "effect": "指定敌方一个合法目标。若其隐蔽，该单位下回合不能主动发动技能；若其已暴露，改为其下一次造成伤害 -1。",
    "ability": {
      "kind": "suppress",
      "rows": ["frontline", "support"],
      "allowExposedTargets": true,
      "damageDebuffIfExposed": 1
    }
  },
  "ru_motostrelki": {
    "effect": "【地面压制】：对一个合法地面目标造成 2 点伤害；若目标为【步兵】，改为 3 点。【炮火协同】：若己方支援区有【榴弹炮】或【火箭炮】，本次伤害 +1。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline"],
      "amount": 2,
      "requiresAnyTag": GROUND_TAGS,
      "bonuses": [{ "tag": "步兵", "amount": 3 }],
      "artillerySynergyBonus": 1,
      "sourceExposes": true
    }
  },
  "ru_kornet_team": {
    "effect": "【反甲伏击】：对一个合法地面目标造成 2 点伤害；若目标为【装甲】，改为 4 点；也可对【直升机】造成 2 点伤害。【前线伏击】：隐蔽部署后因前线接敌被动打击时，伤害 +1。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 2,
      "requiresAnyTag": ["步兵", "装甲", "直升机"],
      "bonuses": [{ "tag": "装甲", "amount": 4 }],
      "sourceExposes": true
    },
    "ambushBonus": 1
  },
  "ru_spetsnaz_target": {
    "effect": "【渗透作战】：本单位不会因前线接敌而暴露。【坐标引导】：选择一个合法目标；若其隐蔽，使其暴露。若己方有本回合未行动的【榴弹炮】或【火箭炮】，可立即对该目标进行一次打击，发动后该火力单位暴露。",
    "ability": {
      "kind": "exposeAndCallFire",
      "rows": ["frontline", "support"],
      "canRevealHidden": true,
      "allowExposedTargets": true,
      "callerTags": ["榴弹炮", "火箭炮"],
      "sourceExposes": true
    },
    "contactException": true
  },
  "ru_bmp3m": {
    "effect": "【伴随火力】：对一个合法地面目标造成 3 点伤害；若目标为【步兵】，改为 4 点；也可对低空目标造成 2 点伤害。【步兵掩护】：己方【步兵】受到【榴弹炮】或【火箭炮】伤害时，伤害 -1，一回合一次。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": [...GROUND_TAGS, ...LOW_AIR_TAGS],
      "bonuses": [
        { "tag": "步兵", "amount": 4 },
        { "tag": "直升机", "amount": 2 },
        { "tag": "无人机", "amount": 2 }
      ],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": ["步兵"],
        "sourceTags": ["榴弹炮", "火箭炮"]
      }
    }
  },
  "ru_t90m": {
    "effect": "【装甲突击】：对一个合法地面或后排装备目标造成 4 点伤害；若目标为【装甲】，改为 5 点；也可对【直升机】造成 1 点伤害。【突破推进】：若己方前线有【步兵】，本次地面伤害 +1，上限 5。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresAnyTag": [...GROUND_OR_REAR_EQUIPMENT_TAGS, "直升机"],
      "bonuses": [
        { "tag": "装甲", "amount": 5 },
        { "tag": "直升机", "amount": 1 }
      ],
      "ownTagBonus": { "line": "frontline", "tag": "步兵", "amount": 1, "cap": 5, "targetTags": GROUND_OR_REAR_EQUIPMENT_TAGS },
      "sourceExposes": true
    }
  },
  "ru_bmpt": {
    "effect": "【火力清剿】：对一个合法地面目标造成 2 点伤害；若目标为【步兵】，改为 4 点；也可对低空目标造成 2 点伤害。【装甲护送】：己方【装甲】受到【步兵】伤害时，伤害 -1，一回合一次。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 2,
      "requiresAnyTag": [...GROUND_TAGS, ...LOW_AIR_TAGS],
      "bonuses": [
        { "tag": "步兵", "amount": 4 },
        { "tag": "直升机", "amount": 2 },
        { "tag": "无人机", "amount": 2 }
      ],
      "sourceExposes": true
    },
    "continuous": {
      "reduceDamage": {
        "amount": 1,
        "targetTags": ["装甲"],
        "sourceTags": ["步兵"]
      }
    }
  },
  "ru_ka52_unit": {
    "effect": "【空中打击】：对一个合法地面、低空或后排装备目标造成 3 点伤害；若目标为【装甲】、【直升机】或【重型防空】，改为 5 点。【前线支援】：敌方前线有单位时，本单位也可以隐蔽部署。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": GROUND_OR_REAR_OR_LOW_AIR_TAGS,
      "bonuses": [
        { "tag": "装甲", "amount": 5 },
        { "tag": "直升机", "amount": 5 },
        { "tag": "重型防空", "amount": 5 }
      ],
      "sourceExposes": true
    }
  },
  "ru_2s19": {
    "effect": "【远程炮击】：对一个合法地面或后排装备目标造成 3 点伤害；若目标为【步兵】，改为 4 点。发动后暴露。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    },
    "fire": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "bonuses": [{ "tag": "步兵", "amount": 4 }],
      "sourceExposes": true
    }
  },
  "ru_tornado_s": {
    "power": 4,
    "effect": "【火力覆盖】：选择一个合法区域，对其中最多三个合法地面或后排装备目标造成伤害，主目标 3 点，其余目标各 1 点。发动后暴露。",
    "ability": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "secondaryAmount": 1,
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "maxTargets": 3,
      "sameLineOnly": true,
      "sourceExposes": true
    },
    "fire": {
      "kind": "areaDamage",
      "rows": ["frontline", "support"],
      "amount": 3,
      "secondaryAmount": 1,
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "maxTargets": 3,
      "sameLineOnly": true,
      "sourceExposes": true
    }
  },
  "ru_pantsir": {
    "effect": "【野战防空】：对一个合法低空或巡航导弹目标造成 2 点伤害；若目标为【直升机】或【无人机】，改为 4 点。【伴随拦截】：敌方【战斗机】或【巡航导弹】打击造成的伤害 -2，一回合一次；不能拦截【弹道导弹】。触发后暴露。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 2,
      "requiresAnyTag": [...LOW_AIR_TAGS, "巡航导弹"],
      "bonuses": [
        { "tag": "直升机", "amount": 4 },
        { "tag": "无人机", "amount": 4 }
      ],
      "sourceExposes": true
    },
    "continuous": {
      "intercept": 2,
      "interceptTags": ["战斗机", "巡航导弹"],
      "protectLines": ["frontline", "support"],
      "sourceExposes": true
    }
  },
  "ru_buk_m3": {
    "effect": "【区域防空】：敌方【战斗机】、【轰炸机】、【巡航导弹】、【弹道导弹】或【SEAD导弹】打击造成的伤害 -2，一回合一次；己方前线与支援区均可受到保护。触发后暴露。【雷达截击】：对一个暴露的高空或导弹目标造成 2 点伤害。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 2,
      "requiresAnyTag": [...HIGH_AIR_TAGS, ...MISSILE_TAGS],
      "requiresExposed": true,
      "sourceExposes": true
    },
    "continuous": {
      "intercept": 2,
      "interceptTags": ["战斗机", "轰炸机", "巡航导弹", "弹道导弹", "SEAD导弹"],
      "protectLines": ["frontline", "support"],
      "sourceExposes": true
    }
  },
  "ru_orlan10": {
    "effect": "【无人侦扫】：选择一个合法目标；若其隐蔽，使其暴露。【炮兵校射】：若本单位本次成功暴露目标，且己方有本回合未行动的【榴弹炮】，可立即调用其打击该目标，本次伤害 +1。",
    "ability": {
      "kind": "exposeAndCallFire",
      "rows": ["frontline", "support"],
      "canRevealHidden": true,
      "allowExposedTargets": true,
      "callerTags": ["榴弹炮"],
      "calledFireBonus": 1,
      "callFireRequiresFreshExpose": true,
      "sourceExposes": true
    }
  },
  "ru_kalibr": {
    "power": 4,
    "effect": "【巡航打击】：对一个暴露的合法目标造成 4 点伤害；若目标在前线，改为 5 点。可被【伴随防空】或【重型防空】拦截。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "lineAmounts": { "frontline": 5 },
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"]
    }
  },
  "ru_iskander": {
    "power": 6,
    "effect": "【弹道导弹】：对一个暴露的合法目标造成 6 点伤害；若目标在支援区，改为 7 点。只能被【重型防空】拦截。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 6,
      "lineAmounts": { "support": 7 },
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["重型防空"]
    }
  },
  "ru_su35": {
    "effect": "【精确空袭】：对一个暴露的合法目标造成 4 点伤害；若目标为【直升机】或高空目标，改为 6 点。可被防空单位拦截。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresExposedOrAnyTag": ["直升机", ...HIGH_AIR_TAGS],
      "bonuses": [
        { "tag": "直升机", "amount": 6 },
        { "tag": "战斗机", "amount": 6 },
        { "tag": "轰炸机", "amount": 6 }
      ],
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"]
    }
  },
  "ru_su57_sead": {
    "id": "ru_su57_sead",
    "faction": "russia",
    "name": "Su-57 SEAD 战斗机",
    "type": "unit",
    "line": "support",
    "power": 5,
    "rarity": "epic",
    "specialization": "反辐射压制、有限制空",
    "tags": ["战斗机", "SEAD", "SEAD导弹"],
    "effect": "【SEAD反辐射导弹】：对一个暴露的【重型防空】造成 5 点伤害。可被一个【重型防空】单位拦截。【有限制空】：对一个暴露的低空或高空目标造成 4 点伤害。可被防空单位拦截。",
    "art": "ru_su57_sead",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 4,
      "requiresAnyTag": [...LOW_AIR_TAGS, ...HIGH_AIR_TAGS, "重型防空"],
      "requiresExposed": true,
      "bonuses": [{ "tag": "重型防空", "amount": 5 }],
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"],
      "interceptByTagsByTargetTag": [{ "tag": "重型防空", "interceptByTags": ["重型防空"] }]
    }
  },
  "ru_su34": {
    "effect": "【对地空袭】：对一个暴露的合法地面或后排装备目标造成 5 点伤害。可被防空单位拦截。",
    "ability": {
      "kind": "damage",
      "rows": ["frontline", "support"],
      "amount": 5,
      "requiresAnyTag": GROUND_OR_REAR_EQUIPMENT_TAGS,
      "requiresExposed": true,
      "sourceExposes": true,
      "interceptByTags": ["伴随防空", "重型防空"]
    }
  },
  "ru_smoke_decoys": {
    "effect": "指定己方一个已暴露单位，使其重新进入隐蔽；若目标在前线，修复 1 点战力。",
    "ability": {
      "kind": "smoke",
      "rows": ["frontline", "support"],
      "hide": true,
      "repairIfLine": { "line": "frontline", "amount": 1 }
    }
  },
  "ru_reposition": {
    "effect": "指定己方一个已暴露单位，使其重新进入隐蔽；若目标在支援区，修复 1 点战力。",
    "ability": {
      "kind": "smoke",
      "rows": ["frontline", "support"],
      "hide": true,
      "repairIfLine": { "line": "support", "amount": 1 }
    }
  },
  "ru_ammo_supply": {
    "effect": "抽 3 张牌，选择 1 张加入手牌，其余放回牌库底。",
    "ability": {
      "kind": "supply",
      "draw": 3,
      "keep": 1,
      "noTarget": true
    }
  },
  "ru_battlefield_repair": {
    "effect": "修复己方一个单位 2 点战力；若己方没有受损单位，抽 2 张牌，选择 1 张加入手牌，其余放回牌库底。",
    "ability": {
      "kind": "repair",
      "rows": ["frontline", "support"],
      "amount": 2,
      "drawAlternative": 2,
      "keepAlternative": 1
    }
  },
  "ru_electronic_suppression": {
    "effect": "指定敌方一个合法目标。若其隐蔽，该单位下回合不能主动发动技能；若其已暴露，改为其下一次造成伤害 -1。",
    "ability": {
      "kind": "suppress",
      "rows": ["frontline", "support"],
      "allowExposedTargets": true,
      "damageDebuffIfExposed": 1
    }
  }
};

Object.assign(CARD_LIBRARY, V43_CARD_OVERRIDES);
Object.entries(V07_CARD_OVERRIDES).forEach(([cardId, patch]) => {
  CARD_LIBRARY[cardId] = {
    ...CARD_LIBRARY[cardId],
    ...patch
  };
});
delete CARD_LIBRARY.us_m88;

const STRIKE_UNIT_RESTORE = {
  "us_atacms": { "power": 5, "tags": ["导弹", "弹道导弹"] },
  "us_tomahawk": { "power": 4, "tags": ["导弹", "巡航导弹"] },
  "us_f35": { "power": 6, "tags": ["战斗机"] },
  "us_f15e": { "power": 5, "tags": ["战斗机"] },
  "us_b2": { "power": 6, "tags": ["轰炸机"] },
  "ru_kalibr": { "power": 4, "tags": ["导弹", "巡航导弹"] },
  "ru_iskander": { "power": 6, "tags": ["导弹", "弹道导弹"] },
  "ru_su35": { "power": 6, "tags": ["战斗机"] },
  "ru_su34": { "power": 5, "tags": ["战斗机"] },
  "ru_tu22m3": { "power": 6, "tags": ["轰炸机"] }
};

Object.entries(STRIKE_UNIT_RESTORE).forEach(([cardId, config]) => {
  const card = CARD_LIBRARY[cardId];
  if (!card) {
    return;
  }
  Object.assign(card, {
    "type": "unit",
    "line": "support",
    "power": config.power,
    "tags": config.tags
  });
  if (card.ability) {
    card.ability.sourceExposes = true;
  }
});

const V07_ACTIVE_CARD_IDS = new Set([
  "us_marine_rifle",
  "us_javelin_team",
  "us_stinger_team",
  "us_rangers_target",
  "us_bradley",
  "us_m1a2",
  "us_stryker",
  "us_apache",
  "us_m109",
  "us_himars",
  "us_avenger",
  "us_patriot",
  "us_reaper",
  "us_atacms",
  "us_tomahawk",
  "us_f35",
  "us_f35a_sead",
  "us_b2",
  "us_smoke_screen",
  "us_reposition",
  "us_battlefield_repair",
  "us_emergency_supply",
  "us_electronic_suppression",
  "ru_motostrelki",
  "ru_kornet_team",
  "ru_spetsnaz_target",
  "ru_bmp3m",
  "ru_t90m",
  "ru_bmpt",
  "ru_ka52_unit",
  "ru_2s19",
  "ru_tornado_s",
  "ru_pantsir",
  "ru_buk_m3",
  "ru_orlan10",
  "ru_kalibr",
  "ru_iskander",
  "ru_su35",
  "ru_su57_sead",
  "ru_su34",
  "ru_smoke_decoys",
  "ru_reposition",
  "ru_ammo_supply",
  "ru_battlefield_repair",
  "ru_electronic_suppression"
]);

Object.keys(CARD_LIBRARY).forEach((cardId) => {
  const card = CARD_LIBRARY[cardId];
  if ((card.faction === "usa" || card.faction === "russia") && !V07_ACTIVE_CARD_IDS.has(cardId)) {
    delete CARD_LIBRARY[cardId];
  }
});

export const STARTER_DECKS = {
  "player": [
    "us_marine_rifle",
    "us_marine_rifle",
    "us_javelin_team",
    "us_stinger_team",
    "us_rangers_target",
    "us_rangers_target",
    "us_bradley",
    "us_bradley",
    "us_m1a2",
    "us_stryker",
    "us_apache",
    "us_f35a_sead",
    "us_m109",
    "us_m109",
    "us_himars",
    "us_himars",
    "us_avenger",
    "us_patriot",
    "us_reaper",
    "us_reaper",
    "us_atacms",
    "us_tomahawk",
    "us_f35",
    "us_b2",
    "us_smoke_screen",
    "us_smoke_screen",
    "us_reposition",
    "us_battlefield_repair",
    "us_emergency_supply",
    "us_electronic_suppression"
  ],
  "enemy": [
    "ru_motostrelki",
    "ru_motostrelki",
    "ru_kornet_team",
    "ru_kornet_team",
    "ru_spetsnaz_target",
    "ru_spetsnaz_target",
    "ru_bmp3m",
    "ru_bmp3m",
    "ru_t90m",
    "ru_bmpt",
    "ru_su57_sead",
    "ru_ka52_unit",
    "ru_ka52_unit",
    "ru_2s19",
    "ru_2s19",
    "ru_tornado_s",
    "ru_tornado_s",
    "ru_pantsir",
    "ru_buk_m3",
    "ru_orlan10",
    "ru_kalibr",
    "ru_iskander",
    "ru_su35",
    "ru_su34",
    "ru_smoke_decoys",
    "ru_reposition",
    "ru_ammo_supply",
    "ru_battlefield_repair",
    "ru_smoke_decoys",
    "ru_electronic_suppression"
  ]
};

export function getCard(id) {
  return CARD_LIBRARY[id];
}

export function getFaction(id) {
  return FACTIONS[id];
}

export function getLine(id) {
  return LINES.find((line) => line.id === id);
}

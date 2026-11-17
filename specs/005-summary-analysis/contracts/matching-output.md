# Contract：呼叫配對資訊輸出（FR-010）

**Feature**: `005-summary-analysis` | 設計理由見 research R9。

## 1. 檔案

- 位置：與 `.graph.dot` 同目錄、同索引：`page<p>/inter-procedurals/<i>.matching.json`、`page<p>/intra-pages/<i>.matching.json`、`inter-page/<i>.matching.json`。
- intra-procedural 模型不輸出（呼叫不透明，FR-009）。
- `.dot` 不因本檔改變（FR-010）。編碼 UTF-8、2 空白縮排、鍵順序固定（便於 golden 雜湊）。

## 2. 格式（`format: "dujs-matching/1"`）

```json
{
  "format": "dujs-matching/1",
  "level": "intraPage",
  "mainScope": "$DOMAIN.$PAGE_0",
  "calls": [
    {
      "id": "c1", "seq": 3, "callSiteLine": 4,
      "callee": "$DOMAIN.$PAGE_0.f",
      "callNode": "n12", "entry": "n20", "exit": "n23",
      "callReturn": "n13", "exceptionalReturn": "n31",
      "back": false, "beforeDecision": false
    }
  ],
  "loops": [
    {
      "loop": "n32", "loopReturn": "n38",
      "handlers": [{"scope": "$DOMAIN.$PAGE_0.h", "entry": "n34", "exit": "n37"}]
    }
  ],
  "summaries": {
    "$DOMAIN.$PAGE_0.f": {
      "normalReturn": true, "conservative": false,
      "gen": ["x@n21"], "mustKill": ["x"], "upwardExposed": [], "exceptional": []
    }
  }
}
```

- 節點一律以 `.graph.dot` 中的節點名稱（`n<k>`）引用；`gen`／`exceptional` 寫成 `<變數>@<定義節點>`；變數名重複時另附宣告行 `x(L1)@n21`。陣列依 seq／節點名排序。
- `level`：`interProcedural`、`intraPage`、`interPage`。`exceptionalReturn` 為 `null` 表示呼叫點沒有例外後繼。
- `summaries` 只列本圖中出現的被呼叫端與處理器。

## 3. 路徑產生器語意

1. 從 `callNode` 沿 call 邊進入 `entry` 的路徑，離開 `exit` 時只能接回同一筆的 `callReturn`（正常抵達 exit：最後一條邊為 normal／true／false／finally）或 `exceptionalReturn`
   （例外抵達 exit：最後一條邊為 exception）。`exit → exceptionalReturn` 是虛擬邊，不在 `.dot` 中。
2. 從 `loop` 沿 onEvent 進入處理器 `entry` 的路徑，離開處理器 `exit` 只能到同一筆的 `loopReturn`；同一處理器若另有 call 紀錄，由該 call 進入者只能依規則 1 返回。
3. `back: true` 的呼叫進入的是祖先已展開的被呼叫端節點，配對規則相同（以堆疊配對）。

## 4. 驗證

- 單元測試：US1-5（P1 的兩條 return 邊各對應 L4／L7；`us3-3.js` 的 `s` 例外只接 L9 catch）、US4-1（P5 的 LOOP 紀錄與 L5 call 紀錄分開）。
- 自我一致：每條 `.graph.dot` 中的 return 邊恰對應一筆 call 紀錄的（exit, callReturn）；每條處理器 exit → loopReturn 邊對應一個 handler。
- golden：新檔登記於 `tests/golden/manifest.json` 各 case 的 `added`；`golden.js` 的檔案清單納入 `*.matching.json`。

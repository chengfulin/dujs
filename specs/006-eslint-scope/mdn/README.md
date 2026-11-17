# MDN 範例集（feature 006 的 MDN 驗證語料）

- **來源**：validation-004 工作目錄（`/private/tmp/claude-501/-Users-chengfulin-Documents-Personal-dujs/cbaaf31a-c3b2-4a55-9ff4-356dc509edf6/scratchpad/mdncheck/ex/`）
  逐字複製（T008）；33 檔的 sha256 前 16 碼與 `docs/research/mdn-baseline/validation-004.md` 附錄 A 逐行相符，未使用備援重新抽取（T009 不需執行）。
- **原始出處**：MDN `mdn/content@74f6e26e70721281aeb500ba4f8c1f06f20b0100`、`mdn/learning-area@21973263ba859ff3477919087b488157f9d618a6`
  （釘選見 `docs/research/mdn-baseline/README.md`；各檔來源見 validation-004 §2）。
- **授權**：CC0（MDN 程式碼範例）。
- **檔案**：`corpus/`（33 檔，32 個 id）；`pages.json`（每個 id 的頁面＝檔案清單；s09 為兩頁 `[["s09-first.js"],["s09-second.js"]]`，其他為單頁單檔）；
  `baseline-develop/`（develop 的 `.dot` 快照與 `<id>.pairs.txt`，見 contracts/diff-check.md §5）。
- 本目錄的程式是分析輸入（瀏覽器程式），不由 Node 執行，已列入 `eslint.config.js` 的 ignores。

## sha256（全碼）

```
a0bb113f20e7b6f69c93b621ef38ab717ab456be1efd4ac303507951ba2810f1  a01-oojs-1.js
05e479c97277e39c40703006ca2975a22de2e8df3d0976aa3af73b6103aa5c38  a01b-oojs-1-solution.js
b2652135ed4c6c24b7d32ad3c4eed7d1d74e897802d2113fd39b3d20e2ce7d7d  a02-oojs-2.js
d8789813d35cc21827862225a4de506030da7a8980a096a50d18ba18e0466c59  a02b-oojs-2-solution.js
3fcf2f3da8163749249e778f3f36b11a73726435b5713bee22ac42018603f959  a03-bouncing-main.js
b69da83e1f70986a9406dd15b70142513a441c134e907d180885d08358971972  a04-bouncing-main-finished.js
a36ee1e4c31bba151562d7219f2dcc4bd380bd74da96df12e50c2e55aa4a75c7  a05-assessment-main.js
91468301177c04caa9c3927afde2cf1df98b537445160faf3583db21c36887eb  a06-classes-snippets.js
9cc181d3e0fb9509cb8d867a1e7b6cf2e61f8c07a2bb7cdda154318898c562d7  a07-prototypes-person.js
39f00da7159a3043a55d58f97be7d5584601706393b86bf502de9b9e4b7aa583  a08-prototype-chain-dowhile.js
1e1dacd2b4b0b54beeb0f9bcf02bd1bc53fc892ff4d486bcfef0cada65868341  s01-math-3-finish.js
14453f3a6c0484a6c6c7b50aa48f2abe7ccd3956e5e639b8dc113723006da696  s02-conditionals-3-finish.js
dd977e7e82e44d57000d65e71ff8917b403469ee018af32a4818da2ba8886352  s03-loops-2-finish.js
6e42b8018214640c57f9e1121909e4e19c2fed86d4a25c778a6782e05e13acfa  s04a-while-loop-cats.js
ed642cd654e546cc83151a23c94335cf951c027364971809fe3fa3d0257672a2  s04b-do-while-loop-cats.js
169a100b29b558c46708c660514502a6a2025020165d7cb2ee9145378ca6e358  s04c-for-loop-cats.js
a29ef9124ffa5161d24315b189490b33e05ae1cefaa2744a8e61810f620522a9  s05-switch-example.js
f3c7b13cedb9ae635cdca1a40ffc547a5dc4bcc7b5ca9adadfdd2fa34031e291  s06a-exiting-loops-break.js
dd90d3b16eec927d2bacfd2eea4c7b793c8bd15d0b8866b4a04e6f73d1f352f2  s06b-silly-story-finish.js
43f8ea7b971c9ca90c476828b940ccdce5abf97e7f5278bd8a13d3476ca26be8  s07-gallery-finish.js
6fe9d1af535afa2e61ab826e3d6c2d248c8a12b4a66bff8e9c40e7c475783dda  s08-number-guessing-game.js
0f753d2d51cbf9a10d87a7a0da1be727587f19e4ee2df4d6684aad3ba7609c4c  s09-first.js
9c331fe4cb81d1af9aba339d1823ac6d60ab4903ed0892464f2a4894be8b59c6  s09-second.js
5ca270cdc2da7f4f1247fb6449e9dd6b9da4e80084bd06a620226e285ebf683d  s10-allowance-updater.js
7d2093494ea2445d86edaf9f113f893859f31fcc314c67d2a1db3522e3a75356  s11-calculating-squares.js
9a808ee2af23bc6142e4f35da2cca47a9c924873e0517a57dcb3dac96bfa7793  s12-conditionals-2-finish.js
b30717f7d387d837f3b3794be170390cb0d772ca3339429751816c6a3c386a41  s13-functions-1-finish.js
fc598bf4ed85e94291440867e78e7ba2f1653f2b91b84e118ffec24580d530c8  s14-functions-3.js
88c2f2e2b72940be7e810135ccd556a48ccc66a18d208d5825df96c77cd76b0f  s15-math-1-finish.js
579beb71dbffe73a738800093cdbb547df4bd7db3f11c9726ec4d88fe8cdd4c1  s16-objects-2-finish.js
3e734f7dc8625dcd95fdb4efb639a676fde4e1e4dc8f8fc2168b88a6b168c7ec  s17-string-methods-3.js
ed936a6d4886d49fe551694528f95c26c18f84b5c31ac2bfb36e45d53833d31e  s18-target-currenttarget.js
b88dbe18838574a4f0634384b48cf2ff8b6c355f8c0df7764d1714cc0403cdd7  x01-bouncing-cycle.js
```

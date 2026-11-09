# WBS — Homework 3: KRAFTON x PUBG Vietnam Championship & Airdrop Arena

## Phạm vi và khảo sát

- Phạm vi riêng: `hw3_lab3_web/`. Không sửa, di chuyển hoặc gộp nội dung HW1/HW2.
- Đặc tả dùng cho WBS: hai ảnh HW3 được gửi trong cuộc trò chuyện và các file HW3 hiện có. Không sử dụng PDF.
- Git root: `D:\PhuThanh\Code\hw_lab3_web`; branch `main` theo dõi `origin/main`.
- Git status khi khảo sát: `main...origin/main`; có hai file root `TASK_DECOMPOSITION.md` và `project_rules.md` đang untracked. Chúng thuộc tài liệu HW1 và không được stage/sửa cho HW3. Folder HW3 có tracked placeholder `README.md`.
- Tại khảo sát, `hw3_lab3_web/` chỉ có `README.md` với nội dung “Reserved for Homework 3; source code has not been uploaded.” Không thấy source Legacy HW3, entrypoint, manifest/build config, test, dữ liệu đội/kill-feed hay backend/API trong folder.
- Root `project_rules.md` ghi rõ là rules HW1; không ghi đè và không áp dụng các quy tắc riêng HW1 cho HW3. Chưa có `hw3_lab3_web/project_rules.md`.
- Không xác định được stack hiện có từ source HW3 vì source chưa có. React 19 là yêu cầu nêu trực tiếp trong ảnh; cấu trúc triển khai cụ thể phải được chốt ở T02 nếu không tìm thấy source/config mới trong folder.

## Contract có căn cứ từ hai ảnh

| Khu vực | Yêu cầu xác định được | Cần kiểm tra thêm / giới hạn hiện tại |
|---|---|---|
| Nền tảng | Xây dựng React 19 esports platform cho PVS Finals Ticket & G-Coin Contraband Crate Arena, kết nối ý tưởng Lab 2 HW3 anti-drift timer và Slide 22 Virtual Scroller. | Không có source Lab 2, Slide 22 hoặc source Legacy HW3 trong folder để đối chiếu cách cài đặt cũ. Không tuyên bố đã tích hợp lại code cũ khi chưa có bằng chứng. |
| Countdown | Hook `usePubgAirdropTimer(targetEpochMs, serverOffsetMs = 0)`; tính `Math.max(0, targetEpochMs - (Date.now() + serverOffsetMs))`; cập nhật theo thời điểm tuyệt đối để không cộng/trừ mỗi tick gây drift; đồng bộ ngay khi tab visible trở lại. | Không có server time endpoint; offset phải được cấp vào hook hoặc dùng mock offset đã ghi nhãn. Tần suất cập nhật UI chưa được đặc tả cứng. |
| Drop domain | `DropPhase` gồm `WARMUP`, `AIRDROP_LIVE`, `LOOTED_OUT`, `EXPIRED`. `PubgCrateDrop` có `id: string`, `title: string`, `priceVnd: number`, `remainingStock: number`, `dropEpochMs: number`. | Không có schema/API Legacy để xác minh thêm thuộc tính hoặc dữ liệu thật. |
| Giá | Định dạng giá VND bằng `Intl.NumberFormat('vi-VN')`. | Cách làm tròn/định dạng giao diện cần dựa trên giá trị dữ liệu; không tự thêm quy tắc tiền tệ khác. |
| Claim | Trừ stock optimistic; khóa claim đang gửi để chống claim trùng; nếu server trả HTTP 409 thì rollback stock/trạng thái claim. Áp dụng cho ticket/crate theo phạm vi ảnh. | Không có backend. Nếu xây dựng frontend demo, phải dùng provider/API mock được ghi nhãn rõ; chỉ mô phỏng nhánh 409 và không gọi đó là phản hồi server thật. |
| Leaderboard | Lọc/sắp xếp đội PUBG VN theo `wwcdCount: number`, `placementPts: number`, `killPts: number`; contract có `squadId: string`, `squadName: string`; các đội: The Expendables, Cerberus Esports, Roy Esports, AGG. | Không có dữ liệu Legacy/nguồn kết quả giải thật. Thứ tự ưu tiên, chiều sort và tie-break không được ghi rõ đầy đủ trong ảnh; chốt trong T02, ghi rõ là quyết định UI nếu phải chọn, không trình bày như dữ liệu/luật chính thức. |
| Kill feed | Có bộ lọc kill-feed và danh sách ảo hóa, kết nối yêu cầu Slide 22 Virtual Scroller. | Không có source Slide 22 hoặc event feed thật; dữ liệu dùng khi demo phải được đánh dấu mock. |
| AI audit | Required `AI_FAILURE_AUDIT.md` (15% in architecture slide), with at least three real AI defects and evidence/fixes. | Audit records three verified defects: two claim implementation defects (one found in review, one exposed by an actual failing test) and one WBS patch typo. No hypothetical defect is counted; see `AI_FAILURE_AUDIT.md`. |

Không có backend/dữ liệu Legacy trong folder tại thời điểm khảo sát. Điều này không chặn contract timer, domain, claim UI, leaderboard/filter hay virtual list đã có căn cứ từ ảnh; chỉ các phản hồi server và dữ liệu chính thức phải để mock/chưa xác minh cho tới khi có nguồn thật.

## Thứ tự công việc

### T01 — Khảo sát HW3, source/config và Git

- **Mục tiêu:** Ghi nhận cấu trúc, stack, entrypoint, tài liệu, backend/dữ liệu nếu có và trạng thái Git mà không đọc PDF hoặc đụng HW1/HW2.
- **Phụ thuộc:** Không.
- **File dự kiến:** `hw3_lab3_web/TASK_DECOMPOSITION.md`.
- **Tiêu chí hoàn thành:** Liệt kê file thật; phân biệt root rules HW1 với HW3; ghi rõ thiếu source/backend thay vì suy đoán.
- **Trạng thái (2026-11-09): HOÀN TẤT.** Folder chỉ có placeholder `README.md`; không tìm thấy app, stack đã cài, entrypoint, backend, dữ liệu Legacy hoặc test. Git root/branch/status được ghi ở phần khảo sát. Không đọc/tìm PDF.

### T02 — Chốt domain, API/mock boundary và contract UI

- **Mục tiêu:** Chốt kiểu dữ liệu, quy tắc phase, claim state, leaderboard/filter và nguồn dữ liệu trước khi viết component phụ thuộc.
- **Phụ thuộc:** T01.
- **File dự kiến:** tài liệu contract trong `hw3_lab3_web/`; cập nhật WBS này nếu cần. Không tạo code trong bước khảo sát.
- **Tiêu chí hoàn thành:** Định nghĩa chính xác `DropPhase`, `PubgCrateDrop`, contract leaderboard, quy tắc hiển thị VND, stock/claim lock/rollback HTTP 409; tách API thật khỏi mock. Ghi rõ thứ tự và tie-break của leaderboard chỉ khi được đặc tả hoặc đánh dấu là lựa chọn sản phẩm cần xác nhận. Ghi interface cho timer visibility resync và đầu vào virtual scroller.
- **Trạng thái (2026-11-09): PARTIAL.** Bốn phase và ba domain records đã được khai báo bằng TypeScript declarations/JSDoc/runtime constants trong `src/domain/pubg-contract.d.mts` và `.mjs`. Giá dùng `Intl.NumberFormat('vi-VN')`; phase resolver bao phủ warmup, live, looted out và trạng thái expired do nguồn ngoài cung cấp. Contract leaderboard sort/tie-break và API/mock boundary vẫn cần chốt trước các task tương ứng.

### T03 — Thiết lập app React 19 và dữ liệu demo có nhãn

- **Mục tiêu:** Dựng nền tảng UI phù hợp source/config thực tế; nếu không có, tạo app React 19 tối thiểu theo yêu cầu ảnh và fixture có nhãn mock.
- **Phụ thuộc:** T02.
- **File dự kiến:** entrypoint/config chỉ trong `hw3_lab3_web/`; các fixture HW3 riêng nếu cần.
- **Tiêu chí hoàn thành:** App chạy theo lệnh được ghi trong folder; không lấy code HW1/HW2 làm scaffold; fixture crate/team/feed được đánh dấu mock và không bị nhầm là dữ liệu PUBG Vietnam Championship chính thức.
- **Trạng thái (2026-11-09): HOÀN TẤT cho app foundation.** Folder ban đầu không có React runtime/config; đã thêm React 19 + Vite, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/styles.css`, package scripts và `.gitignore`. Fixture ticket/crate có nhãn demo; không scaffold từ HW1/HW2. Backend và event/clock server vẫn chưa có.

### T04 — Xây dựng domain contract, phase và định dạng giá

- **Mục tiêu:** Biểu diễn drop/phase theo contract và hiển thị giá VND đúng locale.
- **Phụ thuộc:** T02, T03.
- **File dự kiến:** module domain/types và formatter trong cấu trúc HW3 đã xác nhận.
- **Tiêu chí hoàn thành:** Phase chỉ nhận `WARMUP | AIRDROP_LIVE | LOOTED_OUT | EXPIRED`; drop giữ đủ năm trường bắt buộc; test formatter sử dụng `Intl.NumberFormat('vi-VN')` với giá mẫu; chuyển phase/stock theo dữ liệu rõ ràng, không khẳng định dữ liệu mock là thật.
- **Status (2026-11-09): COMPLETE with data-source limits.** Domain contract, VND formatter, and phase resolver are integrated; domain/formatter/phase tests pass. `EXPIRED` is supplied by external status because `PubgCrateDrop` has no expiry timestamp. Browser showed ticket price as 750,000 VND. Legacy schema and official prices remain unavailable.

### T05 — Tạo anti-drift airdrop countdown hook

- **Mục tiêu:** Tính countdown theo epoch, áp dụng server offset và resync khi tab được hiển thị lại.
- **Phụ thuộc:** T02, T03.
- **File dự kiến:** hook countdown trong thư mục hooks theo cấu trúc hiện hữu; ảnh minh họa `src/hooks/usePubgAirdropTimer.js` là gợi ý từ slide, không phải xác nhận cấu trúc source đang có.
- **Tiêu chí hoàn thành:** Kết quả mỗi lần sync bằng `Math.max(0, targetEpochMs - (Date.now() + serverOffsetMs))`; không giảm counter dựa trên số tick; sync tức thì lúc khởi tạo và `visibilitychange` về visible; timer/listener được dọn khi đổi dependency hoặc unmount; test thời gian trễ/tick chậm, offset, hết hạn và visibility resume.
- **Status (2026-11-09): PARTIAL - countdown/controller is integrated and the app runs, but React unmount cleanup was not directly asserted with a React renderer.** The controller recalculates from epoch time, clamps at zero, pauses while hidden, and resyncs on visibility. Five tests cover past/future targets, offset, delayed frames, background/resume, and disposal/callback cancellation. The hook returns `useEffect` cleanup. Offset defaults to 0 because there is no server clock endpoint.

### T06 — Triển khai optimistic ticket/crate claim và rollback 409

- **Mục tiêu:** Trừ tồn kho ngay khi claim, chống gửi claim trùng và hoàn nguyên chính xác khi conflict.
- **Phụ thuộc:** T02, T03, T04.
- **File dự kiến:** claim service/provider, UI claim controls và test trong HW3.
- **Tiêu chí hoàn thành:** Stock chỉ trừ một lần cho claim đang bay; double click không tạo request trùng; thành công giữ trạng thái cập nhật; HTTP 409 rollback stock và claim state về đúng snapshot, hiển thị trạng thái hết hàng phù hợp; lỗi khác xử lý riêng, không giả là 409. Nếu backend chưa có, demo provider và kết quả 409 mô phỏng phải ghi rõ là mock, không gọi là API thật.
- **Status (2026-11-09): COMPLETE for the labeled mock flow; no real backend exists.** The store performs per-item optimistic deduction and locking, exact rollback for 409/network/other errors, and ignores stale revisions. Tests cover success, optimistic state, resolved/rejected 409, double-click, network failure, concurrent items, stale response, and non-409 HTTP. Browser checks confirmed ticket stock 18 to 17 on success, crate stock restored to 32 on 409, and rollback/message on network failure. Adapter outcomes are explicitly mock.

### T07 — Dựng PUBG VN leaderboard và bộ lọc

- **Mục tiêu:** Hiển thị và lọc bốn đội trong ảnh, sắp xếp bằng các chỉ số WWCD, placement points và kill points.
- **Phụ thuộc:** T02, T03, T04.
- **File dự kiến:** leaderboard component, contract/fixture mock và test riêng HW3.
- **Tiêu chí hoàn thành:** Có đủ The Expendables, Cerberus Esports, Roy Esports, AGG; dữ liệu tuân theo các trường contract; filter hoạt động trên tập đội; sort dùng các chỉ số được nêu, ổn định theo lựa chọn đã ghi ở T02; test filter/sort và xử lý tie theo contract đã chốt; dữ liệu fixture ghi nhãn demo nếu chưa có nguồn chính thức.
- **Status (2026-11-09): COMPLETE for demo data and UI.** Numeric sorting for all three metrics, filtering, stable ties, and source immutability pass tests. Browser filter for AGG leaves one row. The four teams are present with illustrative, non-official scores; no official results source exists.

### T08 — Tích hợp kill-feed filter với virtualized list

- **Mục tiêu:** Cho phép lọc kill feed và chỉ render phần tử cần thiết qua virtual scroller theo ý tưởng Slide 22.
- **Phụ thuộc:** T02, T03.
- **File dự kiến:** kill-feed/filter/virtual-list modules hoặc components trong cấu trúc HW3 đã xác nhận.
- **Tiêu chí hoàn thành:** Filter thay đổi tập event nhìn thấy; virtual list render theo viewport và vùng đệm đã định, không tạo DOM cho toàn bộ dataset lớn; cuộn tới cuối vẫn có thể truy cập các event; empty state và accessible labels có kiểm tra; nếu chưa có event API, fixture được ghi nhãn mock. Không tuyên bố dùng lại Slide 22 code nếu source đó không có.
- **Status (2026-11-09): COMPLETE for demo feed/virtualization.** Filter, empty state, scroll range, overscan, resize, and clamping tests pass. Chrome headless on the running app filtered Cerberus to 70 events; scrolling to the bottom rendered 8 rows (first position 63), not all 160. Feed data is generated demo data, not live.

### T09 — Hoàn thiện trang esports platform và trạng thái responsive

- **Mục tiêu:** Kết nối countdown/drop/claim/leaderboard/kill-feed thành trải nghiệm HW3 nhất quán.
- **Phụ thuộc:** T04–T08.
- **File dự kiến:** App/page/components/styles trong HW3.
- **Tiêu chí hoàn thành:** Mỗi phần hiển thị loading/empty/success/conflict/error phù hợp nguồn dữ liệu; timer live state và phase đồng bộ; claim lock không cho submit lặp; leaderboard/feed dùng dữ liệu đã phân loại thật/mock; bố cục usable ở viewport hẹp/rộng và có thể điều khiển bằng bàn phím.
- **Trạng thái (2026-11-09): HOÀN TẤT cho tích hợp demo UI.** `src/App.jsx` ghép countdown/phase, ticket/crate cards, mock outcome selector, leaderboard và kill feed; `styles.css` cung cấp responsive grid, trạng thái và `:focus-visible` 3px. Claim card phản ánh pending/success/409/network/HTTP error; leaderboard/feed có empty state; countdown và feed giữ cleanup. Chrome headless/CDP trên app Vite: success giảm stock 18→17; network error giữ/rollback stock 32 và hiện lỗi; HTTP 409 trả stock đúng 32 và hiện Looted Out; filter AGG còn một đội; filter Cerberus còn 70 feed events; scroll tới cuối render 8 row với vị trí đầu 63/70; viewport resize đổi chiều cao feed 216→223px và filter co feed về 5 event, pos 1; 360px không tràn ngang; Tab đi qua các control và `:focus-visible` outline solid. Không có browser exception. Tất cả API/data/outcomes trên đây là demo; chưa có backend/live feed.

### T10 — Thu thập AI failure audit có bằng chứng

- **Mục tiêu:** Tạo audit bắt buộc ghi tối thiểu ba lỗi AI thực sự được phát hiện trong quá trình xây dựng HW3 và cách sửa.
- **Phụ thuộc:** T03–T09, cùng các lượt code review/test thực tế.
- **File dự kiến:** `hw3_lab3_web/AI_FAILURE_AUDIT.md` và test/source evidence liên quan.
- **Tiêu chí hoàn thành:** Mỗi mục ghi hành vi sai có thể tái hiện, bằng chứng cụ thể (test, output hoặc file/dòng source), ảnh hưởng, cách sửa và kết quả kiểm tra sau sửa. Chỉ ghi lỗi đã thực sự quan sát; không bịa lỗi, test, kết quả hoặc gán lỗi giả định cho AI. Chưa có tối thiểu ba lỗi xác minh được thì task còn mở và không tạo nội dung giả để đủ số lượng.

- **Status (2026-11-09): COMPLETE with 3 verified entries.** The audit records two claim defects and one documentation-patch defect. The first was found by code review with no retained pre-fix test output; the second has a recorded failing assertion; the third is an observed typo.
### T11 — Kiểm thử tích hợp và tổng kết bằng chứng

- **Mục tiêu:** Chạy kiểm tra trên ứng dụng thật, xác minh timer/claim/leaderboard/virtualization, build và trạng thái dữ liệu.
- **Phụ thuộc:** T04–T10.
- **File dự kiến:** tests phù hợp stack và cập nhật WBS/audit HW3.
- **Tiêu chí hoàn thành:** Test công thức countdown, offset/visibility resync/no drift; domain/formatter; claim double-submit và rollback 409; filter/sort leaderboard; filter/virtual rendering kill feed; app build/run. Ghi chính xác lệnh và output thực tế. Không tuyên bố backend production, dữ liệu giải chính thức, audit thành công hoặc accessibility/performance score nếu chưa có bằng chứng công cụ phù hợp.

- **Status (2026-11-09): COMPLETE for checks available in this project, with limits recorded.** `npm test`: 24/24 pass. `npm run build`: pass. Chrome headless/CDP checks covered claim success/409/network rollback, AGG/Cerberus filters, virtualized row count, 360px overflow, keyboard focus, and no browser exception. `npm run` has no lint script. No React-root unmount assertion, real backend/live data, or formal WCAG/Lighthouse audit.
## Mốc triển khai tham khảo

Đây là nhóm review cho các thay đổi lớn, không yêu cầu commit trong bước khảo sát và không áp dụng/ghi đè quy tắc commit HW1/HW2:

1. **M1 — Contract và app foundation:** T02–T04.
2. **M2 — Timer và claim flow:** T05–T06.
3. **M3 — Esports data surfaces:** T07–T09.
4. **M4 — Verification và AI audit:** T10–T11.

Current state: React 19/Vite app and integrated demo UI for countdown, claim, leaderboard, and kill-feed; domain/controller modules, mock claim adapter, 160-event demo feed, virtualizer, AI_FAILURE_AUDIT.md with 3 verified defects, and 24 passing Node tests. `npm run build` passes; Chrome headless/CDP checks are recorded at T09. No lint script is configured. No backend, server clock, live match feed, or Legacy source exists; offset defaults to 0. Controller cleanup is tested, but React-root unmount is not independently asserted. No formal WCAG/Lighthouse audit was run, so no conformance/score claim is made. This review changed HW3 files only; pre-existing untracked root HW1 documents were left untouched.

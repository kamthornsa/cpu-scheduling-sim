# CPU Scheduling Visual Lab

เปิด cpu-scheduler.html ใน browser ได้โดยตรง ไม่ต้องมี backend
เก็บ scheduler.js, playback.js และ playback.css ไว้ในโฟลเดอร์เดียวกัน

กด ตัวอย่าง → เลือก Algorithm → Run Simulation
- Play / Pause และความเร็ว 0.25×–4× (1× = 1 วินาทีต่อหน่วย)
- Step เดิน/ย้อนครั้งละ 1 หน่วย; Reset ล้างการจำลอง
- Ready Queue, CPU, เวลาที่ใช้/เวลารอ และ Gantt Chart เปลี่ยนตามเวลา
- CT/TAT/WT เปิดเผยเมื่อ Process เสร็จ; RT เมื่อเริ่ม CPU; ค่าเฉลี่ยและการเปรียบเทียบเมื่อจบทั้งหมด
- การเปลี่ยนโจทย์หรือ Algorithm จะล้างการจำลองเดิม

รองรับ FCFS, SJF, SRTF, Priority NP/P และ Round Robin
Tie: Arrival ก่อน แล้ว PID (เรียงตัวเลขตามธรรมชาติ); Preempt เฉพาะ remaining/priority ที่ดีกว่า
RR รับ arrival ที่ขอบ quantum ก่อนนำ process เดิมกลับท้ายคิว
ไม่คิดเวลา context switch; ใช้จำนวนเต็ม; สูงสุด 10 processes
Arrival 0–1000, Burst 1–1000, Priority 1–999, Quantum 1–99

ทดสอบ logic: node scheduler.test.js
browser.test.cjs ใช้ Playwright จาก runtime ในเครื่องนี้และ Microsoft Edge

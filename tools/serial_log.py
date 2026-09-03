# -*- coding: utf-8 -*-
"""
micro:bit 시리얼 로그 리더 — 본체/조정기 콘솔 출력을 실시간 표시 + 파일 기록.

사용법:
    python tools/serial_log.py              # micro:bit 포트 자동 탐색
    python tools/serial_log.py COM5         # 포트 지정
    python tools/serial_log.py COM5 --tag body

- micro:bit v2 를 USB로 연결하면 COM 포트가 잡힘 (DAPLink / mbed Serial Port)
- 종료: Ctrl+C
- 로그 파일: logs/serial_YYYYMMDD_HHMMSS.log (raw 그대로 저장)
"""
import argparse
import sys
import time
from datetime import datetime

try:
    import serial
    from serial.tools import list_ports
except ImportError:
    print("pyserial 없음:  pip install pyserial")
    sys.exit(1)

# ARM mbed / DAPLink (micro:bit 인터페이스 칩) VID
MBED_VID = 0x0D28


def find_microbit_port():
    hits = []
    for p in list_ports.comports():
        if p.vid == MBED_VID:
            hits.append(p)
    if not hits:
        return None
    if len(hits) > 1:
        print("micro:bit 후보 포트가 여러 개:")
        for p in hits:
            print(f"  {p.device}  {p.description}")
    return hits[0].device


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("port", nargs="?", default=None)
    ap.add_argument("--tag", default="dev", help="로그 라인 접두어 (예: body, pad)")
    ap.add_argument("--baud", type=int, default=115200)
    args = ap.parse_args()

    port = args.port or find_microbit_port()
    if not port:
        print("micro:bit COM 포트를 못 찾음. USB 연결 확인 후 포트 직접 지정: python tools/serial_log.py COM5")
        sys.exit(1)

    print(f"[{args.tag}] {port} @ {args.baud} 연결 중... (종료: Ctrl+C)")
    ser = serial.Serial(port, args.baud, timeout=1)

    import os
    os.makedirs("logs", exist_ok=True)
    log_path = f"logs/serial_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{args.tag}.log"
    logf = open(log_path, "a", encoding="utf-8")
    print(f"로그 파일: {log_path}")

    try:
        buf = b""
        while True:
            n = ser.in_waiting
            chunk = ser.read(n if n > 0 else 1)
            if not chunk:
                continue
            buf += chunk
            while b"\n" in buf:
                raw, buf = buf.split(b"\n", 1)
                line = raw.decode("utf-8", errors="replace").strip("\r").strip()
                if not line:
                    continue
                stamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
                print(f"[{stamp}] {line}", flush=True)
                logf.write(f"[{stamp}] {line}\n")
                logf.flush()
    except KeyboardInterrupt:
        print("\n종료.")
    finally:
        ser.close()
        logf.close()


if __name__ == "__main__":
    main()

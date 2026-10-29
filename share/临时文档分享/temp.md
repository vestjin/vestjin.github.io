

 双向交通灯示例。假设用 P1 口接 LED，低电平点亮还是高电平点亮取决于接线；以下按***\*高电平点亮\****编写。

| 引脚               | 灯               |
| ------------------ | ---------------- |
| P1.0 / P1.1 / P1.2 | 南北红 / 黄 / 绿 |
| P1.3 / P1.4 / P1.5 | 东西红 / 黄 / 绿 |

```asm
            ORG     0000H
            SJMP    START

; P1.0 南北红灯
; P1.1 南北黄灯
; P1.2 南北绿灯
; P1.3 东西红灯
; P1.4 东西黄灯
; P1.5 东西绿灯
; 按高电平点亮设置

START:
            MOV     P1, #09H       ; 初始全红

MAIN:
; 南北红，东西绿
            MOV     P1, #21H       ; P1.0 + P1.5
            ACALL   DELAY_LONG

; 南北红，东西黄闪烁，闪 3 次
            MOV     R4, #03
EW_FLASH:
            MOV     P1, #11H       ; 南北红 + 东西黄亮
            ACALL   DELAY_SHORT
            MOV     P1, #01H       ; 南北红，东西黄灭
            ACALL   DELAY_SHORT
            DJNZ    R4, EW_FLASH

; 南北绿，东西红
            MOV     P1, #0CH       ; P1.2 + P1.3
            ACALL   DELAY_LONG

; 南北黄闪烁，东西红，闪 3 次
            MOV     R4, #03
NS_FLASH:
            MOV     P1, #0AH       ; 南北黄亮 + 东西红
            ACALL   DELAY_SHORT
            MOV     P1, #08H       ; 南北黄灭，东西红
            ACALL   DELAY_SHORT
            DJNZ    R4, NS_FLASH

            SJMP    MAIN

; 较长延时
DELAY_LONG:
            MOV     R5, #20
DL1:
            ACALL   DELAY_UNIT
            DJNZ    R5, DL1
            RET

; 较短延时
DELAY_SHORT:
            MOV     R5, #5
DS1:
            ACALL   DELAY_UNIT
            DJNZ    R5, DS1
            RET

; 软件延时，实际时长取决于晶振频率
DELAY_UNIT:
            MOV     R6, #200
DU1:
            MOV     R7, #250
DU2:
            DJNZ    R7, DU2
            DJNZ    R6, DU1
            RET

            END

```


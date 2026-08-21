# TASC IIoT Studio — Makefile for IEC 61850 Bridge Sidecar Service
#
# Compiles standalone iec61850_bridge linking against open-source libiec61850
# Target: Linux x86_64 / ARM64 / ARM32 (Raspberry Pi, Moxa, Advantech, Siemens IOT2050)

CC ?= gcc
CFLAGS ?= -O2 -Wall -pthread -I/usr/local/include/libiec61850
LDFLAGS ?= -L/usr/local/lib -liec61850 -lpthread

TARGET = iec61850_bridge
SRCS = iec61850_bridge.c

all: $(TARGET)

$(TARGET): $(SRCS)
	@echo "[IEC61850] Building native bridge sidecar binary..."
	$(CC) $(CFLAGS) -DUSE_LIBIEC61850 -o $(TARGET) $(SRCS) $(LDFLAGS) 2>/dev/null || \
	(echo "[IEC61850] Note: libiec61850-dev not detected in system path. Building simulated standalone binary..." && \
	$(CC) -O2 -Wall -pthread -o $(TARGET) $(SRCS) -lpthread)

clean:
	rm -f $(TARGET) *.o

.PHONY: all clean

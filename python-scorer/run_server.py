#!/usr/bin/env python3
"""
Start FastAPI server directly
"""

import logging
logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    import uvicorn
    
    print("\nStarting FastAPI Server...")
    print("   URL: http://127.0.0.1:8001")
    print("   Docs: http://127.0.0.1:8001/docs")
    print("   Press CTRL+C to stop\n")
    
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)

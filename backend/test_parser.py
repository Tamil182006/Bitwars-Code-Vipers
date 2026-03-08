from services.error_parser import parse_stack_trace

text = """
Traceback (most recent call last):
  File "app.py", line 10, in <module>
    app.run()
AttributeError: 'Flask' object has no attribute 'run'
"""

print(parse_stack_trace(text))

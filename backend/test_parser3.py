from services.error_parser import parse_stack_trace

text = """Error Info:
{
  "error_type": "AttributeError",
  "error_message": "'Flask' object has no attribute 'run'",
  "files_mentioned": [
    "app.py"
  ],
  "functions_mentioned": [],
  "line_numbers": [
    10
  ]
}
Relevant Files (5):"""
res = parse_stack_trace(text)
print("Type:", res['error_type'])
print("Msg:", res['error_message'])

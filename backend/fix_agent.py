import re

# Read the file
with open('app/agents/base_agent.py', 'r') as f:
    content = f.read()

# New process_message method
new_method = '''    async def process_message(self, message: str) -> Dict[str, Any]:
        """
        Main entry point: Process user message and return response.
        
        Args:
            message: User's natural language message
        
        Returns:
            Dictionary with message, action_taken, and trip_data
        """
        try:
            print(f"\\n[DEBUG] Agent processing message: {message}")
            
            # Invoke the agent
            result = await self.agent_executor.ainvoke({
                "input": message
            })
            
            print(f"[DEBUG] Agent raw result keys: {result.keys()}")
            print(f"[DEBUG] Agent output: {result.get('output', 'NO OUTPUT')[:200]}")
            
            # Ensure we have output
            if "output" not in result:
                print(f"[ERROR] No 'output' in result: {result}")
                raise ValueError(f"Agent returned no output field")
            
            # Build structured response
            response = {
                "message": str(result["output"]),
                "action_taken": self._infer_action(str(result["output"])),
                "trip_data": None
            }
            
            print(f"[DEBUG] Returning response with message length: {len(response['message'])}")
            return response
            
        except Exception as e:
            print(f"\\n[ERROR] Agent exception: {e}")
            import traceback
            traceback.print_exc()
            
            # Return safe error response
            return {
                "message": "I encountered an issue processing that. Could you rephrase or try again?",
                "action_taken": "error",
                "trip_data": None
            }
'''

# Replace the method using regex
pattern = r'    async def process_message\(self, message: str\) -> Dict\[str, Any\]:.*?(?=\n    def |\n\nif __name__|$)'
content = re.sub(pattern, new_method, content, flags=re.DOTALL)

# Write back
with open('app/agents/base_agent.py', 'w') as f:
    f.write(content)

print("✅ Fixed base_agent.py process_message method")

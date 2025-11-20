"""
LangChain Integration Example

Shows how to integrate Z402 payments into LangChain agents for autonomous
API access and premium tool usage.
"""

import asyncio
import os
from typing import Optional

from dotenv import load_dotenv

try:
    from langchain.agents import AgentExecutor, create_react_agent
    from langchain.tools import BaseTool
    from langchain_core.prompts import PromptTemplate
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("LangChain not installed. Install with: pip install langchain")

from z402 import BudgetManager, CreatePaymentIntentParams, Z402Client

load_dotenv()


class PremiumDataTool(BaseTool):
    """
    LangChain tool that can pay for premium API access.

    This tool demonstrates how LangChain agents can autonomously
    manage payments for premium resources.
    """

    name = "premium_data_access"
    description = (
        "Access premium data APIs that require payment. "
        "Use this when you need high-quality, paid data. "
        "Input should be the data type you need."
    )

    def __init__(self):
        super().__init__()
        self.z402 = Z402Client(
            api_key=os.getenv("Z402_API_KEY", ""),
            network="testnet",
            budget_manager=BudgetManager(
                daily_limit="0.5",
                hourly_limit="0.1",
                transaction_limit="0.05",
            ),
        )

    async def _arun(self, query: str) -> str:
        """Async implementation"""
        # Check if budget allows
        if not await self.z402.budget.can_spend("0.01"):
            return "Error: Budget limit exceeded. Cannot access premium data."

        try:
            # Create payment intent
            intent = await self.z402.payments.create(
                CreatePaymentIntentParams(
                    amount="0.01",
                    resource=f"/api/premium/{query}",
                    metadata={"query": query, "tool": "langchain"},
                )
            )

            # In production, you'd actually pay and access the API
            # For demo, just return intent info
            return (
                f"Payment intent created for premium {query} data. "
                f"Cost: 0.01 ZEC. Intent ID: {intent.id}. "
                f"In production, this would access the paid API."
            )

        except Exception as e:
            return f"Error accessing premium data: {str(e)}"

    def _run(self, query: str) -> str:
        """Sync implementation (runs async version)"""
        return asyncio.run(self._arun(query))


class BudgetAwareLangChainAgent:
    """
    LangChain agent with Z402 budget awareness.

    This agent can make autonomous decisions about whether to use
    paid tools based on budget constraints and task importance.
    """

    def __init__(
        self,
        z402_api_key: str,
        daily_budget: str = "1.0",
        llm: Optional[any] = None,
    ):
        if not LANGCHAIN_AVAILABLE:
            raise ImportError("LangChain is required for this example")

        self.budget = BudgetManager(
            daily_limit=daily_budget,
            hourly_limit="0.2",
        )

        self.z402 = Z402Client(
            api_key=z402_api_key,
            network="testnet",
            budget_manager=self.budget,
        )

        # Initialize tools
        self.tools = [
            PremiumDataTool(),
            # Add other tools here
        ]

        # Create LangChain agent
        # Note: In production, you'd use a real LLM here
        self.llm = llm  # or get from LangChain
        self.agent = None  # Would initialize with create_react_agent

    async def run(self, task: str) -> str:
        """
        Run the agent with budget awareness.

        The agent will autonomously decide whether to use paid tools
        based on the task and available budget.
        """
        # Check budget before starting
        stats = await self.budget.get_statistics()
        remaining = stats["daily_remaining"]

        print(f"Budget Status: {stats['daily_spent']}/{stats['daily_limit']} ZEC spent")
        print(f"Remaining: {remaining} ZEC")

        if float(remaining) < 0.01:
            return "Error: Insufficient budget to run task"

        # In production, this would run the LangChain agent
        # For demo, just show how budget would be checked
        return f"Agent would run with {remaining} ZEC budget available"

    async def get_budget_status(self) -> dict:
        """Get current budget status"""
        return await self.budget.get_statistics()


async def demo_langchain_integration():
    """Demo of LangChain + Z402 integration"""
    print("=" * 60)
    print("LangChain + Z402 Integration Demo")
    print("=" * 60)

    api_key = os.getenv("Z402_API_KEY")
    if not api_key:
        print("Error: Z402_API_KEY not set")
        return

    # Create budget-aware agent
    agent = BudgetAwareLangChainAgent(
        z402_api_key=api_key,
        daily_budget="1.0",
    )

    # Example task
    task = "Research the latest cryptocurrency market trends using premium data"

    print(f"\nTask: {task}")
    print("\nAgent Status:")
    result = await agent.run(task)
    print(result)

    # Show budget after task
    print("\nPost-Task Budget:")
    stats = await agent.get_budget_status()
    print(f"Daily Spent: {stats['daily_spent']} ZEC")
    print(f"Daily Remaining: {stats['daily_remaining']} ZEC")
    print(f"Usage: {stats['daily_usage_percent']:.1f}%")

    # Demo the premium data tool directly
    print("\n" + "=" * 60)
    print("Premium Data Tool Demo")
    print("=" * 60)

    tool = PremiumDataTool()
    result = await tool._arun("market-analysis")
    print(f"\nTool Result: {result}")


def create_z402_tools(z402_client: Z402Client) -> list:
    """
    Create a suite of Z402-enabled tools for LangChain.

    Returns list of tools that can autonomously pay for API access.
    """
    tools = []

    # Premium API access tool
    class PaidAPITool(BaseTool):
        name = "paid_api_access"
        description = "Access paid APIs with automatic payment handling"
        z402 = z402_client

        def _run(self, endpoint: str) -> str:
            # Implementation here
            return f"Would access {endpoint} with payment"

    tools.append(PaidAPITool())

    return tools


if __name__ == "__main__":
    if LANGCHAIN_AVAILABLE:
        asyncio.run(demo_langchain_integration())
    else:
        print("Please install LangChain: pip install langchain")

"""Add share_token to tickets

Revision ID: add_share_token
Revises:
Create Date: 2026-03-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_share_token'
down_revision = None  # Update this with your latest migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Add share_token column to tickets table
    op.add_column('tickets',
        sa.Column('share_token', sa.String(length=64), nullable=True)
    )

    # Create unique index on share_token
    op.create_index(
        'ix_tickets_share_token',
        'tickets',
        ['share_token'],
        unique=True
    )


def downgrade():
    # Remove index
    op.drop_index('ix_tickets_share_token', table_name='tickets')

    # Remove column
    op.drop_column('tickets', 'share_token')

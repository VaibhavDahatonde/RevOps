-- Row Level Security (RLS) Policies for RevOps Automation Platform
-- Ensures data access isolation and security compliance

-- Helper functions for role-based access
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is system administrator
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_customer_admin(customer_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin of the specified customer
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE customer_id = customer_id_param
        AND id = auth.uid()
        AND role = 'ADMIN'
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION customer_user_access(customer_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has access to customer data (any role)
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE customer_id = customer_id_param
        AND id = auth.uid()
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check deal ownership or team access
CREATE OR REPLACE FUNCTION can_access_deal(deal_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- User can access deal if:
    -- 1. They own the deal
    -- 2. They are admin of the customer
    -- 3. They have team access (shared customer data)
    
    RETURN EXISTS (
        SELECT 1 FROM deals d
        JOIN customers c ON d.customer_id = c.id
        WHERE d.id = deal_id_param
        AND (
            (d.owner_id = auth.uid()) OR
            (EXISTS (
                SELECT 1 FROM users u 
                WHERE u.customer_id = d.customer_id 
                AND u.id = auth.uid() 
                AND u.role IN ('ADMIN')
                AND u.is_active = TRUE
            )) OR
            (customer_user_access(d.customer_id))
        )
        AND d.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check account access
CREATE OR REPLACE FUNCTION can_access_account(account_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = account_id_param
        AND (
            (a.owner_id = auth.uid()) OR
            (EXISTS (
                SELECT 1 FROM users u 
                WHERE u.customer_id = a.customer_id 
                AND u.id = auth.uid() 
                AND u.is_active = TRUE
            ))
        )
        AND a.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin role for system-wide access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'revops_admin') THEN
        CREATE ROLE revops_admin;
    END IF;
END
$$;

-- Customer table policies
DROP POLICY IF EXISTS customer_access_policy ON customers;
CREATE POLICY customer_access_policy ON customers
    FOR ALL
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (EXISTS (
            SELECT 1 FROM users u 
            WHERE u.customer_id = customers.id 
            AND u.id = auth.uid() 
            AND u.is_active = TRUE
        ))
    );

-- Users table policies
DROP POLICY IF EXISTS users_access_policy ON users;
CREATE POLICY users_access_policy ON users
    FOR ALL
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (customer_user_access(users.customer_id))
    );

DROP POLICY IF EXISTS users_edit_policy ON users;
CREATE POLICY users_edit_policy ON users
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (is_customer_admin(users.customer_id) OR id = auth.uid())
    );

-- Accounts table policies
DROP POLICY IF EXISTS accounts_select_policy ON accounts;
CREATE POLICY accounts_select_policy ON accounts
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (can_access_account(accounts.id))
    );

DROP POLICY IF EXISTS accounts_insert_policy ON accounts;
CREATE POLICY accounts_insert_policy ON accounts
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (customer_user_access(NEW.customer_id))
    );

DROP POLICY IF EXISTS accounts_update_policy ON accounts;
CREATE POLICY accounts_update_policy ON accounts
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (can_access_account(OLD.id) AND customer_user_access(NEW.customer_id))
    );

DROP POLICY IF EXISTS accounts_delete_policy ON accounts;
CREATE POLICY accounts_delete_policy ON accounts
    FOR DELETE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (is_customer_admin(OLD.customer_id))
    );

-- Contacts table policies
DROP POLICY IF EXISTS contacts_select_policy ON contacts;
CREATE POLICY contacts_select_policy ON contacts
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            (contacts.account_id IS NULL AND customer_user_access(contacts.customer_id)) OR
            (contacts.account_id IS NOT NULL AND can_access_account(contacts.account_id))
        )
    );

DROP POLICY IF EXISTS contacts_insert_policy ON contacts;
CREATE POLICY contacts_insert_policy ON contacts
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            (NEW.account_id IS NULL AND customer_user_access(NEW.customer_id)) OR
            (NEW.account_id IS NOT NULL AND can_access_account(NEW.account_id))
        )
    );

DROP POLICY IF EXISTS contacts_update_policy ON contacts;
CREATE POLICY contacts_update_policy ON contacts
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            (OLD.account_id IS NULL AND customer_user_access(OLD.customer_id)) OR
            (OLD.account_id IS NOT NULL AND can_access_account(OLD.account_id))
        ) AND
        (
            (NEW.account_id IS NULL AND customer_user_access(NEW.customer_id)) OR
            (NEW.account_id IS NOT NULL AND can_access_account(NEW.account_id))
        )
    );

-- Deals table policies
DROP POLICY IF EXISTS deals_select_policy ON deals;
CREATE POLICY deals_select_policy ON deals
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            can_access_deal(deals.id) OR
            (customer_user_access(deals.customer_id) AND deals.owner_id IS NOT NULL)
        )
    );

DROP POLICY IF EXISTS deals_insert_policy ON deals;
CREATE POLICY deals_insert_policy ON deals
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

DROP POLICY IF EXISTS deals_update_policy ON deals;
CREATE POLICY deals_update_policy ON deals
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            can_access_deal(OLD.id) AND 
            (
                (is_customer_admin(OLD.customer_id)) OR
                (is_customer_admin(NEW.customer_id)) OR
                (OLD.owner_id = auth.uid()) OR
                (NEW.owner_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS deals_delete_policy ON deals;
CREATE POLICY deals_delete_policy ON deals
    FOR DELETE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        is_customer_admin(OLD.customer_id)
    );

-- Activities table policies
DROP POLICY IF EXISTS activities_select_policy ON activities;
CREATE POLICY activities_select_policy ON activities
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            // If activity belongs to a deal, check deal access
            (activities.deal_id IS NOT NULL AND can_access_deal(activities.deal_id))
            // If activity belongs to account, check account access
            OR (activities.account_id IS NOT NULL AND can_access_account(activities.account_id))
            // If activity is unassigned, check customer access
            OR (activities.deal_id IS NULL AND activities.account_id IS NULL AND customer_user_access(activities.customer_id))
            // Activities owned by user
            OR (activities.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS activities_insert_policy ON activities;
CREATE POLICY activities_insert_policy ON activities
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            (NEW.deal_id IS NOT NULL AND can_access_deal(NEW.deal_id)) OR
            (NEW.account_id IS NOT NULL AND can_access_account(NEW.account_id)) OR
            (NEW.deal_id IS NULL AND NEW.account_id IS NULL AND customer_user_access(NEW.customer_id))
        )
    );

DROP POLICY IF EXISTS activities_update_policy ON activities;
CREATE POLICY activities_update_policy ON activities
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            (customer_user_access(OLD.customer_id) OR activities.owner_id = auth.uid() OR is_customer_admin(OLD.customer_id))
        )
    );

-- Campaigns table policies
DROP POLICY IF EXISTS campaigns_select_policy ON campaigns;
CREATE POLICY campaigns_select_policy ON campaigns
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(campaigns.customer_id)
    );

DROP POLICY IF EXISTS campaigns_insert_policy ON campaigns;
CREATE POLICY campaigns_insert_policy ON campaigns
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

DROP POLICY IF EXISTS campaigns_update_policy ON campaigns;
CREATE POLICY campaigns_update_policy ON campaigns
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (customer_user_access(OLD.customer_id) AND (is_customer_admin(OLD.customer_id) OR campaigns.owner_id = auth.uid()))
    );

-- Campaign members table policies
DROP POLICY IF EXISTS campaign_members_select_policy ON campaign_members;
CREATE POLICY campaign_members_select_policy ON campaign_members
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(campaign_members.customer_id)
    );

DROP POLICY IF EXISTS campaign_members_insert_policy ON campaign_members;
CREATE POLICY campaign_members_insert_policy ON campaign_members
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

-- Support tickets table policies
DROP POLICY IF EXISTS support_tickets_select_policy ON support_tickets;
CREATE POLICY support_tickets_select_policy ON support_tickets
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            (support_tickets.account_id IS NOT NULL AND can_access_account(support_tickets.account_id)) OR
            customer_user_access(support_tickets.customer_id) OR
            support_tickets.assigned_to_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS support_tickets_insert_policy ON support_tickets;
CREATE POLICY support_tickets_insert_policy ON support_tickets
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

DROP POLICY IF EXISTS support_tickets_update_policy ON support_tickets;
CREATE POLICY support_tickets_update_policy ON support_tickets
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            customer_user_access(OLD.customer_id) OR
            support_tickets.assigned_to_id = auth.uid() OR
            is_customer_admin(OLD.customer_id)
        )
    );

-- Subscriptions table policies
DROP POLICY IF EXISTS subscriptions_select_policy ON subscriptions;
CREATE POLICY subscriptions_select_policy ON subscriptions
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            (subscriptions.account_id IS NOT NULL AND can_access_account(subscriptions.account_id)) OR
            customer_user_access(subscriptions.customer_id)
        )
    );

DROP POLICY IF EXISTS subscriptions_insert_policy ON subscriptions;
CREATE POLICY subscriptions_insert_policy ON subscriptions
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

-- Invoices table policies
DROP POLICY IF EXISTS invoices_select_policy ON invoices;
CREATE POLICY invoices_select_policy ON invoices
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            (invoices.account_id IS NOT NULL AND can_access_account(invoices.account_id)) OR
            customer_user_access(invoices.customer_id)
        )
    );

DROP POLICY IF EXISTS invoices_insert_policy ON invoices;
CREATE POLICY invoices_insert_policy ON invoices
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

-- Events table policies (system-wide visibility but customer isolation)
DROP POLICY IF EXISTS events_select_policy ON events;
CREATE POLICY events_select_policy ON events
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(events.customer_id)
    );

-- Metrics table policies
DROP POLICY IF EXISTS metrics_select_policy ON metrics;
CREATE POLICY metrics_select_policy ON metrics
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(metrics.customer_id)
    );

DROP POLICY IF EXISTS metrics_insert_policy ON metrics;
CREATE POLICY metrics_insert_policy ON metrics
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

-- AI insights table policies
DROP POLICY IF EXISTS ai_insights_select_policy ON ai_insights;
CREATE POLICY ai_insights_select_policy ON ai_insights
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            customer_user_access(ai_insights.customer_id) OR
            (ai_insights.entity_type = 'DEAL' AND can_access_deal(ai_insights.entity_id)) OR
            (ai_insights.entity_type = 'ACCOUNT' AND can_access_account(ai_insights.entity_id))
        )
    );

DROP POLICY IF EXISTS ai_insights_update_policy ON ai_insights;
CREATE POLICY ai_insights_update_policy ON ai_insights
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            customer_user_access(ai_insights.customer_id) OR
            ai_insights.acknowledged_by = auth.uid()
        )
    );

-- Reports table policies
DROP POLICY IF EXISTS reports_select_policy ON reports;
CREATE POLICY reports_select_policy ON reports
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(reports.customer_id)
    );

DROP POLICY IF EXISTS reports_insert_policy ON reports;
CREATE POLICY reports_insert_policy ON reports
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

-- Integrations table policies
DROP POLICY IF EXISTS integrations_select_policy ON integrations;
CREATE POLICY integrations_select_policy ON integrations
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(integrations.customer_id)
    );

DROP POLICY IF EXISTS integrations_insert_policy ON integrations;
CREATE POLICY integrations_insert_policy ON integrations
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

DROP POLICY IF EXISTS integrations_update_policy ON integrations;
CREATE POLICY integrations_update_policy ON integrations
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (customer_user_access(OLD.customer_id) AND is_customer_admin(OLD.customer_id))
    );

-- Hygiene rules table policies
DROP POLICY IF EXISTS hygiene_rules_select_policy ON hygiene_rules;
CREATE POLICY hygiene_rules_select_policy ON hygiene_rules
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(hygiene_rules.customer_id)
    );

DROP POLICY IF EXISTS hygiene_rules_insert_policy ON hygiene_rules;
CREATE POLICY hygiene_rules_insert_policy ON hygiene_rules
    FOR INSERT WITH CHECK
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        customer_user_access(NEW.customer_id)
    );

DROP POLICY IF EXISTS hygiene_rules_update_policy ON hygiene_rules;
CREATE POLICY hygiene_rules_update_policy ON hygiene_rules
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (customer_user_access(OLD.customer_id) AND (is_customer_admin(OLD.customer_id) OR hygiene_rules.created_by = auth.uid()))
    );

-- Hygiene issues table policies
DROP POLICY IF EXISTS hygiene_issues_select_policy ON hygiene_issues;
CREATE POLICY hygiene_issues_select_policy ON hygiene_issues
    FOR SELECT
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            customer_user_access(hygiene_issues.customer_id) OR
            hygiene_issues.assigned_to = auth.uid()
        )
    );

DROP POLICY IF EXISTS hygiene_issues_update_policy ON hygiene_issues;
CREATE POLICY hygiene_issues_update_policy ON hygiene_issues
    FOR UPDATE
    TO authenticated, revops_admin
    USING (
        is_system_admin() OR
        (
            customer_user_access(OLD.customer_id) OR
            hygiene_issues.assigned_to = auth.uid()
        )
    );

-- Create view for user-friendly customer data access
CREATE OR REPLACE VIEW customer_summary AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.status,
    c.created_at,
    COUNT(DISTINCT u.id) as user_count,
    COUNT(DISTINCT a.id) as account_count,
    COUNT(DISTINCT d.id) as deal_count,
    COUNT(DISTINCT i.id) as integration_count,
    COALESCE(SUM(CASE WHEN d.stage NOT IN ('CLOSED_WON', 'CLOSED_LOST') THEN d.amount ELSE 0 END), 0) as active_pipeline
FROM customers c
LEFT JOIN users u ON c.id = u.customer_id AND u.deleted_at IS NULL AND u.is_active = TRUE
LEFT JOIN accounts a ON c.id = a.customer_id AND a.deleted_at IS NULL
LEFT JOIN deals d ON c.id = d.customer_id AND d.deleted_at IS NULL
LEFT JOIN integrations i ON c.id = i.customer_id AND i.deleted_at IS NULL AND i.status = 'ACTIVE'
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.email, c.status, c.created_at;

-- Grant appropriate permissions
GRANT SELECT ON customer_summary TO authenticated;
GRANT SELECT ON customer_summary TO revops_admin;

-- Create function for secure data access with logging
CREATE OR REPLACE FUNCTION secure_data_access(access_type TEXT, table_name TEXT, record_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    access_granted BOOLEAN;
BEGIN
    -- Check if user is authenticated
    IF auth.role() = 'anon' THEN
        RAISE EXCEPTION 'Anonymous access not allowed';
        RETURN FALSE;
    END IF;
    
    -- Log access attempt
    INSERT INTO events (
        customer_id,
        event_type,
        event_category,
        source_system,
        entity_type,
        entity_id,
        payload,
        created_at
    ) VALUES (
        COALESCE((SELECT customer_id FROM users WHERE id = auth.uid()), 'unknown'),
        'data_access_' || access_type,
        'SYSTEM',
        'SECURITY_AUDIT',
        table_name,
        record_id,
        json_build_object(
            'user_id', auth.uid(),
            'access_type', access_type,
            'table_name', table_name,
            'record_id', record_id,
            'timestamp', NOW()
        ),
        NOW()
    );
    
    -- Implement access control logic based on table and operation
    CASE table_name
        WHEN 'deals' THEN
            IF record_id IS NOT NULL THEN
                access_granted := can_access_deal(record_id);
            ELSE
                access_granted := auth.role() = 'revops_admin';
            END IF;
        WHEN 'accounts' THEN
            IF record_id IS NOT NULL THEN
                access_granted := can_access_account(record_id);
            ELSE
                access_granted := auth.role() = 'revops_admin';
            END IF;
        WHEN 'customers' THEN
            access_granted := is_system_admin() OR 
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() 
                    AND customer_id = record_id 
                    AND is_active = TRUE
                );
        ELSE
            access_granted := is_system_admin();
    END CASE;
    
    IF NOT access_granted THEN
        RAISE EXCEPTION 'Access denied to % on %', access_type, table_name;
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create data retention policies
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete old events (keep 1 year)
    DELETE FROM events 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Delete old insight records (keep 2 years)
    DELETE FROM ai_insights 
    WHERE status IN ('RESOLVED', 'EXPIRED') 
    AND created_at < NOW() - INTERVAL '2 years';
    
    -- Delete old reports (keep 6 months)
    DELETE FROM reports 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Archive old hygiene issues (keep 3 months)
    UPDATE hygiene_issues 
    SET deleted_at = NOW() 
    WHERE status IN ('RESOLVED', 'IGNORED') 
    AND updated_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup job
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_cron.job 
        WHERE jobname = 'cleanup_old_data'
    ) THEN
        PERFORM cron.schedule('cleanup_old_data', '0 2 * * *', 'SELECT cleanup_old_data();');
    END IF;
END
$$;

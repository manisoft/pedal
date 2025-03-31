import React, { useEffect, useState } from 'react';
import {
    Card,
    Title2,
    Button,
    Text,
    MessageBar,
    MessageBarBody,
    Spinner,
} from '@fluentui/react-components';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TestResult {
    name: string;
    status: 'success' | 'error' | 'loading';
    message: string;
}

const TestConnection = () => {
    const [results, setResults] = useState<TestResult[]>([]);
    const [testing, setTesting] = useState(false);

    const updateResult = (name: string, status: TestResult['status'], message: string) => {
        setResults(prev => {
            const existing = prev.findIndex(r => r.name === name);
            if (existing !== -1) {
                const newResults = [...prev];
                newResults[existing] = { name, status, message };
                return newResults;
            }
            return [...prev, { name, status, message }];
        });
    };

    const testConnection = async () => {
        setTesting(true);
        setResults([]);

        // Test 1: Basic Connection
        updateResult('Database Connection', 'loading', 'Testing connection...');
        try {
            const { data, error } = await supabase.from('profiles').select('count').limit(1);
            if (error) throw error;
            updateResult('Database Connection', 'success', 'Successfully connected to database');
        } catch (error) {
            updateResult('Database Connection', 'error', `Connection failed: ${error.message}`);
        }

        // Test 2: Authentication
        updateResult('Authentication', 'loading', 'Testing authentication...');
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            updateResult('Authentication', 'success',
                session ? 'Authenticated session found' : 'No active session, but auth is working');
        } catch (error) {
            updateResult('Authentication', 'error', `Auth test failed: ${error.message}`);
        }

        // Test 3: Real-time
        updateResult('Real-time Connection', 'loading', 'Testing real-time connection...');
        try {
            const channel = supabase.channel('test');
            const subscription = channel
                .on('presence', { event: 'sync' }, () => {
                    updateResult('Real-time Connection', 'success', 'Real-time connection successful');
                })
                .subscribe();

            // Cleanup subscription after 3 seconds
            setTimeout(() => {
                subscription.unsubscribe();
            }, 3000);
        } catch (error) {
            updateResult('Real-time Connection', 'error', `Real-time test failed: ${error.message}`);
        }

        setTesting(false);
    };

    useEffect(() => {
        testConnection();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <Title2>Database Connection Test</Title2>
                    <Button
                        icon={<RefreshCw />}
                        onClick={testConnection}
                        disabled={testing}
                    >
                        Run Tests
                    </Button>
                </div>

                <div className="space-y-4">
                    {results.map((result) => (
                        <MessageBar
                            key={result.name}
                            intent={result.status === 'error' ? 'error' :
                                result.status === 'success' ? 'success' : 'info'}
                            className="animate-fadeIn"
                        >
                            <MessageBarBody>
                                <div className="flex items-center gap-2">
                                    {result.status === 'loading' ? (
                                        <Spinner size="tiny" />
                                    ) : result.status === 'success' ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        <XCircle className="w-5 h-5" />
                                    )}
                                    <div>
                                        <div className="font-medium">{result.name}</div>
                                        <Text size={200}>{result.message}</Text>
                                    </div>
                                </div>
                            </MessageBarBody>
                        </MessageBar>
                    ))}

                    {results.length === 0 && (
                        <div className="text-center py-8">
                            <Spinner size="medium" />
                            <Text className="block mt-2">Initializing tests...</Text>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default TestConnection;

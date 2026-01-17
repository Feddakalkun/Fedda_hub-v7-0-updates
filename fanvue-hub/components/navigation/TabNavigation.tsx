'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TabNavigation.module.css';

interface Tab {
    name: string;
    path: string;
    icon: string;
}

const tabs: Tab[] = [
    { name: 'My Characters', path: '/characters', icon: '' },
    { name: 'Prompt Studio', path: '/ltx', icon: '' },
    { name: 'Video Studio', path: '/tools/workflow-chain', icon: '' },
    { name: 'Character Studio', path: '/studio/character', icon: '' },
    { name: 'Phone', path: '/phone', icon: '' },
    { name: 'Settings', path: '/settings', icon: '' },
];

import VramPurger from '../VramPurger';

export default function TabNavigation() {
    const pathname = usePathname();

    return (
        <nav className={styles.tabNav}>
            <div className={styles.tabContainer}>
                {tabs.map((tab) => {
                    const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/');

                    return (
                        <Link
                            key={tab.path}
                            href={tab.path}
                            className={`${styles.tab} ${isActive ? styles.active : ''}`}
                        >
                            <span className={styles.icon}>{tab.icon}</span>
                            <span className={styles.label}>{tab.name}</span>
                        </Link>
                    );
                })}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    <VramPurger />
                </div>
            </div>
        </nav>
    );
}


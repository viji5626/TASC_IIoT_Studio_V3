import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppState, AssetNode, AssetTagDefinition, AssetNodeType, EquipmentClass } from '../../types';
import { AssetSyncService } from '../../services/assets/assetSyncService';
import { staticTagService } from '../../services/assets/staticTagService';
import { sqlTagEngine } from '../../services/data/sqlTagEngine';

interface AssetHierarchyManagerViewProps {
  appState: AppState;
  onUpdateAppState: (newState: AppState) => void;
}

export const AssetHierarchyManagerView: React.FC<AssetHierarchyManagerViewProps> = ({
  appState,
  onUpdateAppState
}) => {
  // Ensure default seed hierarchy if none exists
  const hierarchy: AssetNode[] = useMemo(() => {
    if (appState.assetHierarchy && appState.assetHierarchy.length > 0) {
      return appState.assetHierarchy;
    }
    return AssetSyncService.getDefaultSeedHierarchy();
  }, [appState.assetHierarchy]);

  const equipmentClasses: EquipmentClass[] = useMemo(() => {
    if (appState.equipmentClasses && appState.equipmentClasses.length > 0) {
      return appState.equipmentClasses;
    }
    return AssetSyncService.getDefaultEquipmentClasses();
  }, [appState.equipmentClasses]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(hierarchy[0]?.id || '');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const expandAll = (nodes: AssetNode[]) => {
      for (const n of nodes) {
        set.add(n.id);
        if (n.children) expandAll(n.children);
      }
    };
    expandAll(hierarchy);
    return set;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'equipment_tree' | 'equipment_classes'>('equipment_tree');

  // Context Menu State
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuNode, setContextMenuNode] = useState<AssetNode | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or Esc
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null);
        setContextMenuNode(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenuPos(null);
        setContextMenuNode(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Tag Editor Modal
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<AssetTagDefinition | null>(null);
  const [tagModalActiveTab, setTagModalActiveTab] = useState<'general' | 'source' | 'historian' | 'alarms'>('general');

  // Node Editor Modal (Create / Edit)
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [nodeModalMode, setNodeModalMode] = useState<'create' | 'edit'>('create');
  const [nodeFormData, setNodeFormData] = useState<{
    id?: string;
    name: string;
    type: AssetNodeType;
    description: string;
    parentId: string | null;
  }>({
    name: '',
    type: 'equipment',
    description: '',
    parentId: null
  });

  // Instantiate Equipment Class Modal
  const [isInstantiateModalOpen, setIsInstantiateModalOpen] = useState(false);
  const [instantiateConfig, setInstantiateConfig] = useState<{
    classId: string;
    parentNodeId: string;
    instanceName: string;
    addressPrefix: string;
    description: string;
  }>({
    classId: '',
    parentNodeId: '',
    instanceName: '',
    addressPrefix: '',
    description: ''
  });

  // Class Editor Modal (Create / Edit Equipment Class)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<EquipmentClass | null>(null);

  // Helper: Find node by ID
  const findNode = (nodes: AssetNode[], id: string): AssetNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNode(n.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper: Flatten nodes for dropdown selectors
  const flattenNodes = (nodes: AssetNode[], prefix = ''): Array<{ id: string; name: string; path: string; type: AssetNodeType }> => {
    let result: Array<{ id: string; name: string; path: string; type: AssetNodeType }> = [];
    for (const n of nodes) {
      const currentPath = prefix ? `${prefix} / ${n.name}` : n.name;
      result.push({ id: n.id, name: n.name, path: currentPath, type: n.type });
      if (n.children && n.children.length > 0) {
        result = result.concat(flattenNodes(n.children, currentPath));
      }
    }
    return result;
  };

  const allFlatNodes = useMemo(() => flattenNodes(hierarchy), [hierarchy]);
  const selectedNode = useMemo(() => findNode(hierarchy, selectedNodeId), [hierarchy, selectedNodeId]);

  const toggleExpand = (id: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Node Icon Helper
  const getNodeIcon = (type: AssetNodeType) => {
    switch (type) {
      case 'enterprise':
        return <i className="fas fa-globe text-sky-400" />;
      case 'site':
        return <i className="fas fa-industry text-amber-400" />;
      case 'area':
        return <i className="fas fa-cubes text-emerald-400" />;
      case 'line':
        return <i className="fas fa-network-wired text-indigo-400" />;
      case 'equipment':
        return <i className="fas fa-gears text-cyan-400" />;
      default:
        return <i className="fas fa-folder text-slate-400" />;
    }
  };

  // Save Hierarchy & Classes to AppState
  const saveHierarchy = (newHierarchy: AssetNode[], newClasses?: EquipmentClass[]) => {
    const updatedState: AppState = {
      ...appState,
      assetHierarchy: newHierarchy,
      equipmentClasses: newClasses || equipmentClasses
    };
    const syncedState = AssetSyncService.syncAssetHierarchyToAppState(updatedState);
    onUpdateAppState(syncedState);
  };

  // ─── CONTEXT MENU ACTIONS ──────────────────────────────────────────────────

  const handleOpenContextMenu = (e: React.MouseEvent, node: AssetNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuNode(node);
    if (node) {
      setSelectedNodeId(node.id);
    }
  };

  const handleContextAddChild = (childType: AssetNodeType = 'equipment') => {
    const parentId = contextMenuNode ? contextMenuNode.id : (selectedNodeId || null);
    setNodeModalMode('create');
    setNodeFormData({
      name: `New_${childType.charAt(0).toUpperCase() + childType.slice(1)}`,
      type: childType,
      description: '',
      parentId
    });
    setIsNodeModalOpen(true);
    setContextMenuPos(null);
  };

  const handleContextInstantiateClass = (targetNode?: AssetNode) => {
    const target = targetNode || contextMenuNode || selectedNode;
    const firstClass = equipmentClasses[0];
    setInstantiateConfig({
      classId: firstClass?.id || '',
      parentNodeId: target?.id || hierarchy[0]?.id || '',
      instanceName: firstClass ? `${firstClass.name.replace(/\s+Class$/, '')}_01` : 'New_Equipment',
      addressPrefix: '',
      description: firstClass?.description || ''
    });
    setIsInstantiateModalOpen(true);
    setContextMenuPos(null);
  };

  const handleContextEditNode = () => {
    if (!contextMenuNode) return;
    setNodeModalMode('edit');
    setNodeFormData({
      id: contextMenuNode.id,
      name: contextMenuNode.name,
      type: contextMenuNode.type,
      description: contextMenuNode.description || '',
      parentId: contextMenuNode.parentId || null
    });
    setIsNodeModalOpen(true);
    setContextMenuPos(null);
  };

  const handleContextDeleteNode = () => {
    if (!contextMenuNode) return;
    if (hierarchy.length <= 1 && hierarchy[0].id === contextMenuNode.id) {
      alert('Cannot delete the root Enterprise node. You must keep at least one root node.');
      setContextMenuPos(null);
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${contextMenuNode.name}" and all of its child equipment & tags?`)) {
      const deleteRecursive = (nodes: AssetNode[]): AssetNode[] => {
        return nodes
          .filter(n => n.id !== contextMenuNode.id)
          .map(n => ({
            ...n,
            children: n.children ? deleteRecursive(n.children) : undefined
          }));
      };
      const updated = deleteRecursive(hierarchy);
      saveHierarchy(updated);
      if (selectedNodeId === contextMenuNode.id) {
        setSelectedNodeId(updated[0]?.id || '');
      }
    }
    setContextMenuPos(null);
  };

  const handleContextDuplicateNode = () => {
    if (!contextMenuNode) return;
    const duplicateNodeRecursive = (node: AssetNode): AssetNode => {
      const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      return {
        ...node,
        id: newId,
        name: `${node.name}_Copy`,
        tags: node.tags?.map(t => ({
          ...t,
          tagId: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          path: `${node.name}_Copy/${t.tagName}`
        })),
        children: node.children?.map(c => duplicateNodeRecursive(c))
      };
    };

    const clone = duplicateNodeRecursive(contextMenuNode);
    if (!contextMenuNode.parentId) {
      saveHierarchy([...hierarchy, clone]);
    } else {
      const insertRecursive = (nodes: AssetNode[]): AssetNode[] => {
        return nodes.map(n => {
          if (n.id === contextMenuNode.parentId) {
            return { ...n, children: [...(n.children || []), clone] };
          }
          if (n.children) return { ...n, children: insertRecursive(n.children) };
          return n;
        });
      };
      saveHierarchy(insertRecursive(hierarchy));
    }
    setSelectedNodeId(clone.id);
    setContextMenuPos(null);
  };

  // ─── NODE SAVE / CREATE HANDLER ────────────────────────────────────────────

  const handleSaveNode = () => {
    if (!nodeFormData.name.trim()) return;

    if (nodeModalMode === 'edit' && nodeFormData.id) {
      const updateNodeRecursive = (nodes: AssetNode[]): AssetNode[] => {
        return nodes.map(n => {
          if (n.id === nodeFormData.id) {
            return {
              ...n,
              name: nodeFormData.name.trim(),
              type: nodeFormData.type,
              description: nodeFormData.description.trim()
            };
          }
          if (n.children) return { ...n, children: updateNodeRecursive(n.children) };
          return n;
        });
      };
      saveHierarchy(updateNodeRecursive(hierarchy));
    } else {
      const newNode: AssetNode = {
        id: `node_${Date.now()}`,
        name: nodeFormData.name.trim(),
        type: nodeFormData.type,
        description: nodeFormData.description.trim(),
        parentId: nodeFormData.parentId,
        children: [],
        tags: []
      };

      if (!nodeFormData.parentId) {
        saveHierarchy([...hierarchy, newNode]);
      } else {
        const insertNodeRecursive = (nodes: AssetNode[]): AssetNode[] => {
          return nodes.map(n => {
            if (n.id === nodeFormData.parentId) {
              return { ...n, children: [...(n.children || []), newNode] };
            }
            if (n.children) return { ...n, children: insertNodeRecursive(n.children) };
            return n;
          });
        };
        saveHierarchy(insertNodeRecursive(hierarchy));
        setExpandedNodeIds(prev => new Set(prev).add(nodeFormData.parentId!));
      }
      setSelectedNodeId(newNode.id);
    }
    setIsNodeModalOpen(false);
  };

  // ─── INSTANTIATE EQUIPMENT CLASS ───────────────────────────────────────────

  const handleExecuteInstantiate = () => {
    const targetClass = equipmentClasses.find(c => c.id === instantiateConfig.classId);
    if (!targetClass || !instantiateConfig.instanceName.trim()) return;

    const targetParent = findNode(hierarchy, instantiateConfig.parentNodeId);
    const parentPath = targetParent ? targetParent.name : 'Plant';

    const instantiatedTags: AssetTagDefinition[] = targetClass.tags.map(t => {
      const addr = instantiateConfig.addressPrefix ? `${instantiateConfig.addressPrefix}${t.source.address}` : t.source.address;
      return {
        ...t,
        tagId: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        path: `${parentPath}/${instantiateConfig.instanceName}/${t.tagName}`,
        source: {
          ...t.source,
          address: addr
        }
      };
    });

    const newEquipmentNode: AssetNode = {
      id: `equip_${Date.now()}`,
      name: instantiateConfig.instanceName.trim(),
      type: 'equipment',
      description: instantiateConfig.description || targetClass.description,
      parentId: instantiateConfig.parentNodeId || null,
      equipmentClassId: targetClass.id,
      tags: instantiatedTags,
      children: []
    };

    if (!instantiateConfig.parentNodeId) {
      saveHierarchy([...hierarchy, newEquipmentNode]);
    } else {
      const insertRecursive = (nodes: AssetNode[]): AssetNode[] => {
        return nodes.map(n => {
          if (n.id === instantiateConfig.parentNodeId) {
            return { ...n, children: [...(n.children || []), newEquipmentNode] };
          }
          if (n.children) return { ...n, children: insertRecursive(n.children) };
          return n;
        });
      };
      saveHierarchy(insertRecursive(hierarchy));
      setExpandedNodeIds(prev => new Set(prev).add(instantiateConfig.parentNodeId));
    }

    setSelectedNodeId(newEquipmentNode.id);
    setIsInstantiateModalOpen(false);
    setActiveTab('equipment_tree');
  };

  // ─── CLASS CRUD ────────────────────────────────────────────────────────────

  const handleOpenCreateClass = () => {
    setEditingClass({
      id: `class_${Date.now()}`,
      name: 'New Equipment Class',
      category: 'General Industrial',
      description: 'Standard equipment template with predefined telemetry and alarms',
      tags: [
        {
          tagId: 'tpl_status',
          tagName: 'Status',
          dataType: 'Boolean',
          source: { protocol: 'modbus', address: '10001', access: 'read' }
        },
        {
          tagId: 'tpl_speed_sp',
          tagName: 'Speed_SP',
          dataType: 'Float',
          unit: 'RPM',
          sourceType: 'static',
          staticConfig: { initialValue: 1450, persisted: true, storageTarget: 'local_storage' },
          source: { protocol: 'memory', address: 'SP', access: 'read_write' }
        },
        {
          tagId: 'tpl_speed_pv',
          tagName: 'Speed_PV',
          dataType: 'Float',
          unit: 'RPM',
          source: { protocol: 'modbus', address: '40001', access: 'read' },
          historian: { enabled: true, logMode: 'periodic', intervalMs: 1000 },
          alarms: {
            enabled: true,
            alarmType: 'deviation',
            deviation: { setpointTagReference: 'Speed_SP', maxDelta: 50, priority: 'HIGH', message: 'Speed Deviation Trip!' }
          }
        }
      ]
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = () => {
    if (!editingClass || !editingClass.name.trim()) return;
    const existingIdx = equipmentClasses.findIndex(c => c.id === editingClass.id);
    let updatedClasses: EquipmentClass[];
    if (existingIdx >= 0) {
      updatedClasses = [...equipmentClasses];
      updatedClasses[existingIdx] = editingClass;
    } else {
      updatedClasses = [...equipmentClasses, editingClass];
    }
    saveHierarchy(hierarchy, updatedClasses);
    setIsClassModalOpen(false);
  };

  const handleDeleteClass = (classId: string) => {
    if (window.confirm('Are you sure you want to delete this equipment class?')) {
      const filtered = equipmentClasses.filter(c => c.id !== classId);
      saveHierarchy(hierarchy, filtered);
    }
  };

  // ─── TAG MASTER HANDLERS ───────────────────────────────────────────────────

  const handleOpenAddTag = () => {
    setEditingTag({
      tagId: `tag_${Date.now()}`,
      tagName: 'New_Tag',
      path: selectedNode ? `${selectedNode.name}/New_Tag` : '',
      dataType: 'Float',
      unit: '',
      scanRateMs: 500,
      source: {
        protocol: 'modbus',
        address: '40001',
        pollIntervalMs: 500
      },
      historian: {
        enabled: false,
        logMode: 'periodic',
        intervalMs: 1000,
        retentionDays: 30
      },
      alarms: {
        enabled: false,
        alarmType: 'analog_4_limit',
        highHigh: { setpoint: 100, priority: 'CRITICAL', message: 'High-High Limit Exceeded!' },
        high: { setpoint: 80, priority: 'HIGH', message: 'High Limit Exceeded' }
      }
    });
    setTagModalActiveTab('general');
    setIsTagModalOpen(true);
  };

  const handleSaveTag = () => {
    if (!selectedNode || !editingTag) return;

    const updateTagsRecursive = (nodes: AssetNode[]): AssetNode[] => {
      return nodes.map(n => {
        if (n.id === selectedNode.id) {
          const existingTags = n.tags || [];
          const idx = existingTags.findIndex(t => t.tagId === editingTag.tagId);
          let newTags: AssetTagDefinition[];
          if (idx >= 0) {
            newTags = [...existingTags];
            newTags[idx] = editingTag;
          } else {
            newTags = [...existingTags, editingTag];
          }
          return { ...n, tags: newTags };
        }
        if (n.children) {
          return { ...n, children: updateTagsRecursive(n.children) };
        }
        return n;
      });
    };

    const newHierarchy = updateTagsRecursive(hierarchy);
    saveHierarchy(newHierarchy);

    // Initialize in runtime engines
    if (editingTag.sourceType === 'static' && editingTag.staticConfig) {
      staticTagService.setTagValue(
        editingTag.tagId,
        editingTag.path,
        editingTag.staticConfig.initialValue,
        editingTag.dataType
      );
    } else if (editingTag.sourceType === 'sql_query' && editingTag.sqlConfig) {
      sqlTagEngine.registerSqlTag(editingTag.tagId, editingTag.path, editingTag.sqlConfig);
    }

    setIsTagModalOpen(false);
  };

  const handleDeleteTag = (tagId: string) => {
    if (!selectedNode) return;
    const updateTagsRecursive = (nodes: AssetNode[]): AssetNode[] => {
      return nodes.map(n => {
        if (n.id === selectedNode.id) {
          return { ...n, tags: (n.tags || []).filter(t => t.tagId !== tagId) };
        }
        if (n.children) {
          return { ...n, children: updateTagsRecursive(n.children) };
        }
        return n;
      });
    };
    saveHierarchy(updateTagsRecursive(hierarchy));
  };

  // Render Tree Node Recursively
  const renderTreeNode = (node: AssetNode, level: number = 0) => {
    const isExpanded = expandedNodeIds.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const tagCount = node.tags?.length || 0;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => setSelectedNodeId(node.id)}
          onContextMenu={e => handleOpenContextMenu(e, node)}
          className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-xs group ${
            isSelected
              ? 'bg-sky-500/20 border border-sky-500/40 text-sky-200 font-semibold'
              : 'hover:bg-slate-800/80 text-slate-300'
          }`}
          style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <i className={`fas fa-caret-${isExpanded ? 'down' : 'right'} text-[11px]`} />
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span className="shrink-0">{getNodeIcon(node.type)}</span>
          <span className="truncate flex-1">{node.name}</span>
          {tagCount > 0 && (
            <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
              {tagCount}
            </span>
          )}
          <button
            type="button"
            onClick={e => handleOpenContextMenu(e, node)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-sky-300 text-slate-400 transition-opacity"
            title="Right-click for options"
          >
            <i className="fas fa-ellipsis-vertical text-[10px]" />
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-slate-800 ml-4">
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Categories for Equipment Classes
  const classCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('All');
    for (const c of equipmentClasses) {
      if (c.category) cats.add(c.category);
    }
    return Array.from(cats);
  }, [equipmentClasses]);

  const filteredClasses = useMemo(() => {
    return equipmentClasses.filter(c => {
      const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
      const matchesSearch = !classSearchQuery ||
        c.name.toLowerCase().includes(classSearchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(classSearchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [equipmentClasses, selectedCategory, classSearchQuery]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Banner & Mode Switcher */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
            <i className="fas fa-sitemap text-white text-sm" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>ISA-95 Asset Hierarchy & Master Tag Engine</span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.2 rounded-full font-mono font-bold">
                ISA-95 Unified
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Right-click any node in the hierarchy to add child equipment, instantiate classes, or manage telemetry tags.
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('equipment_tree')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'equipment_tree'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-network-wired" />
            <span>Equipment Hierarchy</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('equipment_classes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'equipment_classes'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-share-nodes" />
            <span>Equipment Classes ({equipmentClasses.length})</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: EQUIPMENT HIERARCHY TREE VIEW ────────────────────────── */}
      {activeTab === 'equipment_tree' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: ISA-95 Tree */}
          <div
            onContextMenu={e => handleOpenContextMenu(e, null)}
            className="w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col"
          >
            <div className="p-3 border-b border-slate-800 flex items-center gap-2">
              <div className="relative flex-1">
                <i className="fas fa-search absolute left-2.5 top-2.5 text-slate-500 text-xs" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search equipment or tags..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleContextAddChild('equipment')}
                title="Add Child Node"
                className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs transition-colors shrink-0 flex items-center space-x-1"
              >
                <i className="fas fa-plus" />
              </button>
              <button
                type="button"
                onClick={() => handleContextInstantiateClass()}
                title="Instantiate Equipment Class"
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-colors shrink-0 flex items-center space-x-1"
              >
                <i className="fas fa-bolt" />
              </button>
            </div>

            {/* Tree Scroll Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {hierarchy.map(node => renderTreeNode(node, 0))}
            </div>

            {/* Tree Quick Footer Tip */}
            <div className="p-2 border-t border-slate-800/80 bg-slate-950/50 text-[10px] text-slate-400 flex items-center justify-between">
              <span><i className="fas fa-mouse-pointer mr-1 text-sky-400" /> Right-click for options</span>
              <span className="font-mono">{allFlatNodes.length} Nodes</span>
            </div>
          </div>

          {/* Right Column: Node Details & Tag Master Property Sheet */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/60">
            {selectedNode ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Selected Node Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                      <span className="uppercase font-mono tracking-wider font-bold text-sky-400">
                        {selectedNode.type}
                      </span>
                      <span>•</span>
                      <span>ID: <code className="text-slate-300 font-mono">{selectedNode.id}</code></span>
                      {selectedNode.equipmentClassId && (
                        <>
                          <span>•</span>
                          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono text-[10px]">
                            Class: {equipmentClasses.find(c => c.id === selectedNode.equipmentClassId)?.name || 'Class Instance'}
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      {getNodeIcon(selectedNode.type)}
                      <span>{selectedNode.name}</span>
                    </h2>
                    {selectedNode.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{selectedNode.description}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleContextInstantiateClass(selectedNode)}
                      className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-all border border-indigo-500/40 flex items-center space-x-1.5"
                    >
                      <i className="fas fa-bolt" />
                      <span>Instantiate Class</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddTag}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center space-x-1.5"
                    >
                      <i className="fas fa-plus" />
                      <span>Add Asset Tag</span>
                    </button>
                  </div>
                </div>

                {/* Tag List Table */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Tag Name</th>
                          <th className="py-2.5 px-3">Data Type</th>
                          <th className="py-2.5 px-3">Units</th>
                          <th className="py-2.5 px-3">Source & Address</th>
                          <th className="py-2.5 px-3">Historian</th>
                          <th className="py-2.5 px-3">Alarms</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(selectedNode.tags || []).map(tag => (
                          <tr key={tag.tagId} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-white font-mono flex items-center space-x-2">
                              <i className="fas fa-tag text-sky-400 text-[10px]" />
                              <span>{tag.tagName}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">{tag.dataType}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{tag.unit || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {tag.sourceType === 'static' ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                  STATIC: {String(tag.staticConfig?.initialValue ?? '0')}
                                </span>
                              ) : tag.sourceType === 'sql_query' ? (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                                  SQL: {tag.sqlConfig?.tableName || 'Custom'}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                                  {tag.source.protocol.toUpperCase()}: {tag.source.address}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {tag.historian?.enabled ? (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                                  Logging ({tag.historian.logMode})
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Disabled</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {tag.alarms?.enabled ? (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                                  Armed ({tag.alarms.alarmType})
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">None</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTag(tag);
                                  setTagModalActiveTab('general');
                                  setIsTagModalOpen(true);
                                }}
                                className="text-slate-400 hover:text-sky-400 transition-colors p-1"
                                title="Edit Tag"
                              >
                                <i className="fas fa-pen-to-square text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTag(tag.tagId)}
                                className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                                title="Delete Tag"
                              >
                                <i className="fas fa-trash-can text-xs" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(!selectedNode.tags || selectedNode.tags.length === 0) && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                              No tags configured under this node. Click <strong>+ Add Asset Tag</strong> or <strong>Instantiate Class</strong>.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select an equipment node from the hierarchy tree to inspect and configure tags.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: EQUIPMENT CLASSES MANAGEMENT VIEW ────────────────────── */}
      {activeTab === 'equipment_classes' && (
        <div className="flex-1 flex flex-col overflow-hidden p-5">
          {/* Header Bar with Search, Category Filter, and Add Class */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative w-72">
                <i className="fas fa-search absolute left-3 top-2.5 text-slate-500 text-xs" />
                <input
                  type="text"
                  value={classSearchQuery}
                  onChange={e => setClassSearchQuery(e.target.value)}
                  placeholder="Search equipment classes..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Category Badges */}
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {classCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateClass}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2"
            >
              <i className="fas fa-plus" />
              <span>Create Equipment Class</span>
            </button>
          </div>

          {/* Equipment Classes Grid */}
          <div className="flex-1 overflow-y-auto pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map(cls => (
              <div
                key={cls.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                      {cls.category || 'Standard Class'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      {cls.tags?.length || 0} Tags
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors flex items-center space-x-2">
                    <i className="fas fa-cubes text-sky-400 text-sm" />
                    <span>{cls.name}</span>
                  </h3>
                  {cls.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cls.description}</p>
                  )}

                  {/* Predefined Tags Preview */}
                  <div className="mt-3.5 space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Predefined Class Telemetry</span>
                      <span>Protocol</span>
                    </div>
                    {cls.tags.slice(0, 4).map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-mono text-slate-300">
                        <span className="flex items-center space-x-1.5">
                          <i className="fas fa-tag text-[9px] text-sky-400" />
                          <span>{t.tagName}</span>
                          <span className="text-[10px] text-slate-500">({t.dataType})</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{t.source.protocol.toUpperCase()}</span>
                      </div>
                    ))}
                    {cls.tags.length > 4 && (
                      <div className="text-[10px] text-slate-500 text-center pt-1 font-mono">
                        + {cls.tags.length - 4} more parameters...
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClass(cls);
                        setIsClassModalOpen(true);
                      }}
                      className="p-1.5 hover:text-sky-400 text-slate-400 transition-colors"
                      title="Edit Class"
                    >
                      <i className="fas fa-pen-to-square text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-1.5 hover:text-rose-400 text-slate-400 transition-colors"
                      title="Delete Class"
                    >
                      <i className="fas fa-trash-can text-xs" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setInstantiateConfig({
                        classId: cls.id,
                        parentNodeId: selectedNodeId || hierarchy[0]?.id || '',
                        instanceName: `${cls.name.replace(/\s+Class$/, '')}_01`,
                        addressPrefix: '',
                        description: cls.description || ''
                      });
                      setIsInstantiateModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center space-x-1.5"
                  >
                    <i className="fas fa-bolt" />
                    <span>Instantiate to Tree</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── RIGHT CLICK CONTEXT MENU ─────────────────────────────────────── */}
      {contextMenuPos && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl py-1 w-60 text-xs text-slate-200 animate-fadeIn"
          style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px` }}
        >
          <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>{contextMenuNode ? contextMenuNode.name : 'Asset Hierarchy Root'}</span>
            <span className="text-[9px] text-slate-500">{contextMenuNode?.type || 'root'}</span>
          </div>

          <button
            type="button"
            onClick={() => handleContextAddChild('equipment')}
            className="w-full text-left px-3 py-2 hover:bg-sky-600/20 hover:text-sky-300 flex items-center space-x-2 transition-colors"
          >
            <i className="fas fa-gears w-4 text-cyan-400" />
            <span>Add Child Equipment</span>
          </button>

          <button
            type="button"
            onClick={() => handleContextAddChild('area')}
            className="w-full text-left px-3 py-2 hover:bg-sky-600/20 hover:text-sky-300 flex items-center space-x-2 transition-colors"
          >
            <i className="fas fa-cubes w-4 text-emerald-400" />
            <span>Add Child Area / Line</span>
          </button>

          <button
            type="button"
            onClick={() => handleContextAddChild('folder')}
            className="w-full text-left px-3 py-2 hover:bg-sky-600/20 hover:text-sky-300 flex items-center space-x-2 transition-colors"
          >
            <i className="fas fa-folder w-4 text-amber-400" />
            <span>Add Child Folder</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            type="button"
            onClick={() => handleContextInstantiateClass()}
            className="w-full text-left px-3 py-2 hover:bg-indigo-600/20 hover:text-indigo-300 flex items-center space-x-2 transition-colors"
          >
            <i className="fas fa-bolt w-4 text-indigo-400" />
            <span>Instantiate from Class...</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (contextMenuNode) setSelectedNodeId(contextMenuNode.id);
              handleOpenAddTag();
              setContextMenuPos(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-sky-600/20 hover:text-sky-300 flex items-center space-x-2 transition-colors"
          >
            <i className="fas fa-tag w-4 text-sky-400" />
            <span>Add Asset Tag...</span>
          </button>

          {contextMenuNode && (
            <>
              <div className="my-1 border-t border-slate-800" />

              <button
                type="button"
                onClick={handleContextEditNode}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center space-x-2 transition-colors"
              >
                <i className="fas fa-pen-to-square w-4 text-slate-400" />
                <span>Rename / Edit Node</span>
              </button>

              <button
                type="button"
                onClick={handleContextDuplicateNode}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center space-x-2 transition-colors"
              >
                <i className="fas fa-copy w-4 text-slate-400" />
                <span>Duplicate Equipment</span>
              </button>

              <button
                type="button"
                onClick={handleContextDeleteNode}
                className="w-full text-left px-3 py-2 hover:bg-rose-900/30 hover:text-rose-400 flex items-center space-x-2 transition-colors text-rose-400"
              >
                <i className="fas fa-trash-can w-4" />
                <span>Delete Node</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* ─── NODE CREATE / EDIT MODAL ─────────────────────────────────────── */}
      {isNodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600/30 border border-sky-500/40 flex items-center justify-center text-sky-300">
                  <i className="fas fa-sitemap" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {nodeModalMode === 'create' ? 'Create New Hierarchy Node' : 'Edit Hierarchy Node'}
                  </h3>
                  <p className="text-[11px] text-slate-400">ISA-95 Equipment Hierarchy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNodeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <i className="fas fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Node Name</label>
                <input
                  type="text"
                  value={nodeFormData.name}
                  onChange={e => setNodeFormData({ ...nodeFormData, name: e.target.value })}
                  placeholder="e.g. Boiler_02 or Line_04"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Node Type (ISA-95)</label>
                  <select
                    value={nodeFormData.type}
                    onChange={e => setNodeFormData({ ...nodeFormData, type: e.target.value as AssetNodeType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-semibold"
                  >
                    <option value="enterprise">Enterprise</option>
                    <option value="site">Site / Plant</option>
                    <option value="area">Area / Section</option>
                    <option value="line">Production Line</option>
                    <option value="equipment">Equipment / Machine</option>
                    <option value="folder">Folder / Group</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Parent Node</label>
                  <select
                    value={nodeFormData.parentId || ''}
                    disabled={nodeModalMode === 'edit'}
                    onChange={e => setNodeFormData({ ...nodeFormData, parentId: e.target.value || null })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">[Root Enterprise Level]</option>
                    {allFlatNodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.path} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={nodeFormData.description}
                  onChange={e => setNodeFormData({ ...nodeFormData, description: e.target.value })}
                  placeholder="e.g. Primary High Pressure Steam Boiler Unit"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 resize-none focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-800 flex items-center justify-end space-x-2 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsNodeModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNode}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5"
              >
                <i className="fas fa-check" />
                <span>{nodeModalMode === 'create' ? 'Create Node' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── INSTANTIATE CLASS MODAL ──────────────────────────────────────── */}
      {isInstantiateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                  <i className="fas fa-bolt" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Instantiate Equipment Class</h3>
                  <p className="text-[11px] text-slate-400">Generate full equipment instance with preconfigured tags</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstantiateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <i className="fas fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Select Equipment Class</label>
                <select
                  value={instantiateConfig.classId}
                  onChange={e => {
                    const cls = equipmentClasses.find(c => c.id === e.target.value);
                    setInstantiateConfig({
                      ...instantiateConfig,
                      classId: e.target.value,
                      instanceName: cls ? `${cls.name.replace(/\s+Class$/, '')}_01` : instantiateConfig.instanceName,
                      description: cls?.description || ''
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                >
                  {equipmentClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tags.length} Predefined Tags)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">New Instance Name</label>
                  <input
                    type="text"
                    value={instantiateConfig.instanceName}
                    onChange={e => setInstantiateConfig({ ...instantiateConfig, instanceName: e.target.value })}
                    placeholder="e.g. Pump_02"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Target Parent Node</label>
                  <select
                    value={instantiateConfig.parentNodeId}
                    onChange={e => setInstantiateConfig({ ...instantiateConfig, parentNodeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {allFlatNodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.path}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Address Prefix (Optional)</label>
                <input
                  type="text"
                  value={instantiateConfig.addressPrefix}
                  onChange={e => setInstantiateConfig({ ...instantiateConfig, addressPrefix: e.target.value })}
                  placeholder="e.g. plant/pumps/2/ or Modbus offset prefix"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Tags to be created summary */}
              {(() => {
                const targetCls = equipmentClasses.find(c => c.id === instantiateConfig.classId);
                if (!targetCls) return null;
                return (
                  <div className="p-3 bg-slate-950/80 border border-indigo-950/50 rounded-xl space-y-1.5">
                    <div className="text-[11px] font-bold text-indigo-300 uppercase flex items-center justify-between">
                      <span>Tags to be generated ({targetCls.tags.length})</span>
                      <span className="font-normal text-[10px] text-slate-400">Auto-synced with Historian & Alarms</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {targetCls.tags.map((t, idx) => (
                        <span key={idx} className="bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                          {t.tagName} ({t.dataType})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-3.5 border-t border-slate-800 flex items-center justify-end space-x-2 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsInstantiateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteInstantiate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5"
              >
                <i className="fas fa-bolt" />
                <span>Instantiate Equipment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CLASS EDITOR MODAL ───────────────────────────────────────────── */}
      {isClassModalOpen && editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                  <i className="fas fa-share-nodes" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Equipment Class Template Editor</h3>
                  <p className="text-[11px] text-slate-400">Define reusable machine structure and telemetry parameters</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <i className="fas fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Class Name</label>
                  <input
                    type="text"
                    value={editingClass.name}
                    onChange={e => setEditingClass({ ...editingClass, name: e.target.value })}
                    placeholder="e.g. Centrifugal Chiller Class"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Category</label>
                  <input
                    type="text"
                    value={editingClass.category || ''}
                    onChange={e => setEditingClass({ ...editingClass, category: e.target.value })}
                    placeholder="e.g. Rotating Machinery / HVAC"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Description</label>
                <input
                  type="text"
                  value={editingClass.description || ''}
                  onChange={e => setEditingClass({ ...editingClass, description: e.target.value })}
                  placeholder="e.g. Standard VFD Motor drive telemetry and fault protection"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Class Tags Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase">Predefined Parameter Tags ({editingClass.tags.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newTplTag = {
                        tagId: `tpl_tag_${Date.now()}`,
                        tagName: `Param_${editingClass.tags.length + 1}`,
                        dataType: 'Float' as const,
                        unit: '',
                        source: { protocol: 'modbus' as const, address: '40001', access: 'read' as const }
                      };
                      setEditingClass({
                        ...editingClass,
                        tags: [...editingClass.tags, newTplTag]
                      });
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold flex items-center space-x-1"
                  >
                    <i className="fas fa-plus text-[10px]" />
                    <span>Add Tag Template</span>
                  </button>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-2 px-2.5">Tag Name</th>
                        <th className="py-2 px-2.5">Data Type</th>
                        <th className="py-2 px-2.5">Unit</th>
                        <th className="py-2 px-2.5">Protocol</th>
                        <th className="py-2 px-2.5">Default Address</th>
                        <th className="py-2 px-2.5 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {editingClass.tags.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-1.5 px-2.5">
                            <input
                              type="text"
                              value={t.tagName}
                              onChange={e => {
                                const copy = [...editingClass.tags];
                                copy[idx] = { ...copy[idx], tagName: e.target.value };
                                setEditingClass({ ...editingClass, tags: copy });
                              }}
                              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-100 font-mono text-xs w-28"
                            />
                          </td>
                          <td className="py-1.5 px-2.5">
                            <select
                              value={t.dataType}
                              onChange={e => {
                                const copy = [...editingClass.tags];
                                copy[idx] = { ...copy[idx], dataType: e.target.value as any };
                                setEditingClass({ ...editingClass, tags: copy });
                              }}
                              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200 text-xs"
                            >
                              <option value="Float">Float</option>
                              <option value="Integer">Integer</option>
                              <option value="Boolean">Boolean</option>
                              <option value="String">String</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2.5">
                            <input
                              type="text"
                              value={t.unit || ''}
                              onChange={e => {
                                const copy = [...editingClass.tags];
                                copy[idx] = { ...copy[idx], unit: e.target.value };
                                setEditingClass({ ...editingClass, tags: copy });
                              }}
                              placeholder="RPM, °C, bar"
                              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-100 font-mono text-xs w-16"
                            />
                          </td>
                          <td className="py-1.5 px-2.5">
                            <select
                              value={t.source.protocol}
                              onChange={e => {
                                const copy = [...editingClass.tags];
                                copy[idx] = {
                                  ...copy[idx],
                                  source: { ...copy[idx].source, protocol: e.target.value as any }
                                };
                                setEditingClass({ ...editingClass, tags: copy });
                              }}
                              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200 text-xs"
                            >
                              <option value="modbus">Modbus</option>
                              <option value="opcua">OPC UA</option>
                              <option value="mqtt">MQTT</option>
                              <option value="memory">Memory / SP</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2.5">
                            <input
                              type="text"
                              value={t.source.address}
                              onChange={e => {
                                const copy = [...editingClass.tags];
                                copy[idx] = {
                                  ...copy[idx],
                                  source: { ...copy[idx].source, address: e.target.value }
                                };
                                setEditingClass({ ...editingClass, tags: copy });
                              }}
                              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-100 font-mono text-xs w-32"
                            />
                          </td>
                          <td className="py-1.5 px-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const copy = editingClass.tags.filter((_, i) => i !== idx);
                                setEditingClass({ ...editingClass, tags: copy });
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <i className="fas fa-trash-can text-xs" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-800 flex items-center justify-end space-x-2 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClass}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5"
              >
                <i className="fas fa-check" />
                <span>Save Equipment Class</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAG MASTER MULTI-TAB PROPERTY SHEET MODAL ────────────────────── */}
      {isTagModalOpen && editingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600/30 border border-sky-500/40 flex items-center justify-center text-sky-300">
                  <i className="fas fa-tag" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Asset Tag Master Property Sheet</h3>
                  <p className="text-[11px] text-slate-400">
                    Node: <span className="text-sky-300 font-mono">{selectedNode?.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTagModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 transition-colors"
              >
                <i className="fas fa-xmark text-sm" />
              </button>
            </div>

            {/* Property Sheet Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/30 px-4">
              {[
                { id: 'general', label: '1. General', icon: 'fa-sliders' },
                { id: 'source', label: '2. Driver & SQL Source', icon: 'fa-plug' },
                { id: 'historian', label: '3. Trend Historian', icon: 'fa-chart-line' },
                { id: 'alarms', label: '4. Alarm Engine', icon: 'fa-bell' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTagModalActiveTab(t.id as any)}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 ${
                    tagModalActiveTab === t.id
                      ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <i className={`fas ${t.icon}`} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-5 overflow-y-auto flex-1 text-xs">
              {/* TAB 1: GENERAL */}
              {tagModalActiveTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Tag Name</label>
                      <input
                        type="text"
                        value={editingTag.tagName}
                        onChange={e =>
                          setEditingTag({
                            ...editingTag,
                            tagName: e.target.value,
                            path: `${selectedNode?.name || 'Plant'}/${e.target.value}`
                          })
                        }
                        placeholder="e.g. Supply_Temp"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Data Type</label>
                      <select
                        value={editingTag.dataType}
                        onChange={e => setEditingTag({ ...editingTag, dataType: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                      >
                        <option value="Float">Float (Analog IEEE-754)</option>
                        <option value="Integer">Integer (16/32-bit)</option>
                        <option value="Boolean">Boolean (Digital 0/1)</option>
                        <option value="String">String (ASCII Text)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Engineering Units</label>
                      <input
                        type="text"
                        value={editingTag.unit || ''}
                        onChange={e => setEditingTag({ ...editingTag, unit: e.target.value })}
                        placeholder="e.g. °C, bar, RPM, kW"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Scan Rate (ms)</label>
                      <input
                        type="number"
                        value={editingTag.scanRateMs || 500}
                        onChange={e => setEditingTag({ ...editingTag, scanRateMs: parseInt(e.target.value) || 500 })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Description</label>
                    <textarea
                      rows={2}
                      value={editingTag.description || ''}
                      onChange={e => setEditingTag({ ...editingTag, description: e.target.value })}
                      placeholder="e.g. Evaporator Chilled Water Supply Temperature"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 resize-none focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: SOURCE */}
              {tagModalActiveTab === 'source' && (
                <div className="space-y-4">
                  {/* Source Type Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase">
                      Tag Telemetry Source Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTag({ ...editingTag, sourceType: 'driver' })}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all ${
                          !editingTag.sourceType || editingTag.sourceType === 'driver' || editingTag.sourceType === 'mqtt'
                            ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <i className="fas fa-plug text-xs" />
                        <span>Live Driver / MQTT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingTag({
                            ...editingTag,
                            sourceType: 'static',
                            staticConfig: editingTag.staticConfig || {
                              initialValue: '1450',
                              persisted: true,
                              storageTarget: 'local_storage'
                            }
                          })
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all ${
                          editingTag.sourceType === 'static'
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <i className="fas fa-cube text-xs" />
                        <span>Static Local Setpoint</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingTag({
                            ...editingTag,
                            sourceType: 'sql_query',
                            sqlConfig: editingTag.sqlConfig || {
                              queryMode: 'cell_lookup',
                              tableName: 'recipes',
                              columnName: 'target_speed',
                              keyColumn: 'recipe_id',
                              keyValue: '1',
                              pollIntervalMs: 5000,
                              writable: true
                            }
                          })
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all ${
                          editingTag.sourceType === 'sql_query'
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <i className="fas fa-table-cells text-xs" />
                        <span>SQL Cell Query</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. Live Driver / MQTT Configuration */}
                  {(!editingTag.sourceType || editingTag.sourceType === 'driver' || editingTag.sourceType === 'mqtt') && (
                    <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Protocol</label>
                          <select
                            value={editingTag.source.protocol}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                source: { ...editingTag.source, protocol: e.target.value as any }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500 text-xs"
                          >
                            <option value="modbus">Modbus TCP / RTU</option>
                            <option value="opcua">OPC UA Client</option>
                            <option value="mqtt">MQTT JSON / Sparkplug</option>
                            <option value="memory">Internal Simulation Tag</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Poll Interval (ms)</label>
                          <input
                            type="number"
                            value={editingTag.source.pollIntervalMs || 500}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                source: { ...editingTag.source, pollIntervalMs: parseInt(e.target.value) || 500 }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Address / NodeId / Topic</label>
                        <input
                          type="text"
                          value={editingTag.source.address}
                          onChange={e =>
                            setEditingTag({
                              ...editingTag,
                              source: { ...editingTag.source, address: e.target.value }
                            })
                          }
                          placeholder="e.g. 40001 or ns=2;s=Pump1.Speed or plant/pumps/1/speed"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* 2. Static Local Tag Configuration */}
                  {editingTag.sourceType === 'static' && (
                    <div className="space-y-3 p-3.5 bg-slate-950/80 border border-emerald-950/50 rounded-xl">
                      <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase">
                        <i className="fas fa-cube" />
                        <span>Local SCADA Memory Register & Setpoint</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Initial / Default Value</label>
                          <input
                            type="text"
                            value={String(editingTag.staticConfig?.initialValue ?? '')}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                staticConfig: {
                                  persisted: editingTag.staticConfig?.persisted ?? true,
                                  initialValue: e.target.value,
                                  storageTarget: 'local_storage'
                                }
                              })
                            }
                            placeholder="e.g. 1200 or 7.5 or true"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500 text-xs"
                          />
                        </div>
                        <div className="flex flex-col justify-end pb-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingTag.staticConfig?.persisted ?? true}
                              onChange={e =>
                                setEditingTag({
                                  ...editingTag,
                                  staticConfig: {
                                    initialValue: editingTag.staticConfig?.initialValue ?? '0',
                                    persisted: e.target.checked,
                                    storageTarget: 'local_storage'
                                  }
                                })
                              }
                              className="w-4 h-4 accent-emerald-500 rounded"
                            />
                            <span className="text-xs text-slate-200 font-medium">Persist across Studio reloads (IndexedDB / SQLite)</span>
                          </label>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        This tag will act as an internal memory setpoint. You can compare live driver tags against this setpoint in HMI Dynics or Alarm deviation checks.
                      </p>
                    </div>
                  )}

                  {/* 3. SQL Database Cell Configuration */}
                  {editingTag.sourceType === 'sql_query' && (
                    <div className="space-y-3 p-3.5 bg-slate-950/80 border border-purple-950/50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold uppercase">
                          <i className="fas fa-table-cells" />
                          <span>Database SQL Cell Query</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-400">Mode:</span>
                          <select
                            value={editingTag.sqlConfig?.queryMode || 'cell_lookup'}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                sqlConfig: {
                                  ...(editingTag.sqlConfig || { pollIntervalMs: 5000 }),
                                  queryMode: e.target.value as any
                                }
                              })
                            }
                            className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-1"
                          >
                            <option value="cell_lookup">Direct Cell Mapping</option>
                            <option value="scalar_query">Custom SQL Query</option>
                          </select>
                        </div>
                      </div>

                      {editingTag.sqlConfig?.queryMode === 'cell_lookup' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Table Name</label>
                            <input
                              type="text"
                              value={editingTag.sqlConfig?.tableName || ''}
                              onChange={e =>
                                setEditingTag({
                                  ...editingTag,
                                  sqlConfig: { ...editingTag.sqlConfig!, queryMode: 'cell_lookup', tableName: e.target.value }
                                })
                              }
                              placeholder="e.g. recipes"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Value Column</label>
                            <input
                              type="text"
                              value={editingTag.sqlConfig?.columnName || ''}
                              onChange={e =>
                                setEditingTag({
                                  ...editingTag,
                                  sqlConfig: { ...editingTag.sqlConfig!, queryMode: 'cell_lookup', columnName: e.target.value }
                                })
                              }
                              placeholder="e.g. target_speed"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Key Column</label>
                            <input
                              type="text"
                              value={editingTag.sqlConfig?.keyColumn || ''}
                              onChange={e =>
                                setEditingTag({
                                  ...editingTag,
                                  sqlConfig: { ...editingTag.sqlConfig!, queryMode: 'cell_lookup', keyColumn: e.target.value }
                                })
                              }
                              placeholder="e.g. recipe_id"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Key Value</label>
                            <input
                              type="text"
                              value={editingTag.sqlConfig?.keyValue || ''}
                              onChange={e =>
                                setEditingTag({
                                  ...editingTag,
                                  sqlConfig: { ...editingTag.sqlConfig!, queryMode: 'cell_lookup', keyValue: e.target.value }
                                })
                              }
                              placeholder="e.g. 1"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-slate-100"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Scalar SQL Statement</label>
                          <textarea
                            rows={2}
                            value={editingTag.sqlConfig?.customQuery || ''}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                sqlConfig: { ...editingTag.sqlConfig!, queryMode: 'scalar_query', customQuery: e.target.value }
                              })
                            }
                            placeholder="SELECT target_rpm FROM plant_recipes WHERE active = 1 LIMIT 1;"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 font-mono text-xs text-purple-300 resize-none"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={editingTag.sqlConfig?.writable ?? true}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                sqlConfig: { ...editingTag.sqlConfig!, writable: e.target.checked }
                              })
                            }
                            className="w-3.5 h-3.5 accent-purple-500 rounded"
                          />
                          <span>Bi-directional Write-Back (executes SQL UPDATE on write)</span>
                        </label>

                        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                          <span>Poll:</span>
                          <input
                            type="number"
                            value={editingTag.sqlConfig?.pollIntervalMs || 5000}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                sqlConfig: { ...editingTag.sqlConfig!, pollIntervalMs: parseInt(e.target.value) || 5000 }
                              })
                            }
                            className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-slate-200 text-xs"
                          />
                          <span>ms</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HISTORIAN */}
              {tagModalActiveTab === 'historian' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div>
                      <strong className="block text-xs text-white">Enable Trend Historian Logging</strong>
                      <span className="text-[11px] text-slate-400">Automatically stream to persistent storage</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingTag.historian?.enabled || false}
                      onChange={e =>
                        setEditingTag({
                          ...editingTag,
                          historian: {
                            ...(editingTag.historian || { logMode: 'periodic' }),
                            enabled: e.target.checked
                          }
                        })
                      }
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                  </div>

                  {editingTag.historian?.enabled && (
                    <div className="space-y-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Logging Mode</label>
                          <select
                            value={editingTag.historian.logMode}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                historian: { ...editingTag.historian!, logMode: e.target.value as any }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                          >
                            <option value="periodic">Periodic (Fixed Interval)</option>
                            <option value="on_change">On Change / Exception</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Deadband</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTag.historian.deadband || 0}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                historian: { ...editingTag.historian!, deadband: parseFloat(e.target.value) || 0 }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Condition Trigger Tag (Optional)</label>
                        <input
                          type="text"
                          value={editingTag.historian.triggerTag || ''}
                          onChange={e =>
                            setEditingTag({
                              ...editingTag,
                              historian: { ...editingTag.historian!, triggerTag: e.target.value }
                            })
                          }
                          placeholder="e.g. Asset:Plant/Pumps/Pump_01/Run_Status (logs only when == 1)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ALARMS */}
              {tagModalActiveTab === 'alarms' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div>
                      <strong className="block text-xs text-white">Enable Alarm Engine Thresholds</strong>
                      <span className="text-[11px] text-slate-400">Trigger SCADA alarms & event notifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingTag.alarms?.enabled || false}
                      onChange={e =>
                        setEditingTag({
                          ...editingTag,
                          alarms: {
                            ...(editingTag.alarms || { alarmType: 'analog_4_limit' }),
                            enabled: e.target.checked
                          }
                        })
                      }
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </div>

                  {editingTag.alarms?.enabled && (
                    <div className="space-y-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase text-rose-400">
                            High-High Limit (Critical)
                          </label>
                          <input
                            type="number"
                            value={editingTag.alarms.highHigh?.setpoint || 0}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                alarms: {
                                  ...editingTag.alarms!,
                                  highHigh: {
                                    setpoint: parseFloat(e.target.value) || 0,
                                    priority: 'CRITICAL',
                                    message: `${editingTag.tagName} Critically High!`
                                  }
                                }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-rose-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase text-amber-400">
                            High Limit (Warning)
                          </label>
                          <input
                            type="number"
                            value={editingTag.alarms.high?.setpoint || 0}
                            onChange={e =>
                              setEditingTag({
                                ...editingTag,
                                alarms: {
                                  ...editingTag.alarms!,
                                  high: {
                                    setpoint: parseFloat(e.target.value) || 0,
                                    priority: 'HIGH',
                                    message: `${editingTag.tagName} High Warning`
                                  }
                                }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Deviation Alarm from Setpoint Tag */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-300 uppercase">
                          <i className="fas fa-scale-unbalanced text-xs" />
                          <span>Setpoint Deviation Alarm (PV vs SP Delta)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Setpoint Tag Reference</label>
                            <input
                              type="text"
                              value={editingTag.alarms.deviation?.setpointTagReference || ''}
                              onChange={e =>
                                setEditingTag({
                                  ...editingTag,
                                  alarms: {
                                    ...editingTag.alarms!,
                                    deviation: {
                                      setpointTagReference: e.target.value,
                                      maxDelta: editingTag.alarms?.deviation?.maxDelta || 10,
                                      priority: 'HIGH',
                                      message: `${editingTag.tagName} deviated from setpoint!`
                                    }
                                  }
                                })
                              }
                              placeholder="e.g. Asset:Plant/Pumps/Pump_01/Target_SP"
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Max Delta (Trip Tolerance)</label>
                            <input
                              type="number"
                              value={editingTag.alarms.deviation?.maxDelta || 10}
                              onChange={e =>
                                setEditingTag({
                                  ...editingTag,
                                  alarms: {
                                    ...editingTag.alarms!,
                                    deviation: {
                                      setpointTagReference: editingTag.alarms?.deviation?.setpointTagReference || '',
                                      maxDelta: parseFloat(e.target.value) || 10,
                                      priority: 'HIGH',
                                      message: `${editingTag.tagName} deviated from setpoint!`
                                    }
                                  }
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-end space-x-2 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsTagModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTag}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <i className="fas fa-check" />
                <span>Save Tag & Sync Runtimes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

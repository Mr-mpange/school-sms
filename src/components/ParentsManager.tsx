import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Users, 
  Phone, 
  GraduationCap, 
  MapPin, 
  User,
  Filter,
  Trash2,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Parent {
  id: string;
  phone_number: string;
  name: string | null;
  student_name: string | null;
  class_year: string | null;
  region: string | null;
  created_at: string;
}

const ParentsManager: React.FC = () => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchParents();
  }, []);

  useEffect(() => {
    filterParents();
  }, [parents, searchTerm, classFilter, regionFilter]);

  const fetchParents = async () => {
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParents(data || []);
    } catch (error) {
      console.error('Error fetching parents:', error);
      toast({
        title: "Error",
        description: "Failed to load parent contacts",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterParents = () => {
    let filtered = parents;

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(parent =>
        parent.phone_number.includes(searchTerm) ||
        parent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(parent => parent.class_year === classFilter);
    }

    // Region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter(parent => parent.region === regionFilter);
    }

    setFilteredParents(filtered);
  };

  const getUniqueValues = (field: keyof Parent) => {
    const values = parents
      .map(parent => parent[field])
      .filter(value => value !== null && value !== '')
      .filter((value, index, arr) => arr.indexOf(value) === index);
    return values as string[];
  };

  const deleteParent = async (parentId: string) => {
    try {
      const { error } = await supabase
        .from('parents')
        .delete()
        .eq('id', parentId);

      if (error) throw error;

      setParents(prev => prev.filter(p => p.id !== parentId));
      toast({
        title: "Contact Deleted",
        description: "Parent contact has been removed successfully"
      });
    } catch (error) {
      console.error('Error deleting parent:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete parent contact",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading parent contacts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Parent Directory</span>
            <Badge variant="secondary" className="ml-2">
              {filteredParents.length} contacts
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage parent contacts with search and filtering options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by phone, name, or student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {getUniqueValues('class_year').map(classYear => (
                  <SelectItem key={classYear} value={classYear}>
                    {classYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {getUniqueValues('region').map(region => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-primary rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Contacts</p>
                  <p className="text-2xl font-bold">{parents.length}</p>
                </div>
                <Users className="w-8 h-8 opacity-75" />
              </div>
            </div>
            
            <div className="bg-gradient-subtle border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Classes</p>
                  <p className="text-2xl font-bold text-foreground">
                    {getUniqueValues('class_year').length}
                  </p>
                </div>
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            <div className="bg-gradient-subtle border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Regions</p>
                  <p className="text-2xl font-bold text-foreground">
                    {getUniqueValues('region').length}
                  </p>
                </div>
                <MapPin className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          {/* Parents Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>Phone Number</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Parent Name</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Student Name</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>Class</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Region</span>
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No parent contacts found</p>
                        <p className="text-sm">Upload a contact list to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParents.map((parent) => (
                    <TableRow key={parent.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono">
                        {parent.phone_number}
                      </TableCell>
                      <TableCell>
                        {parent.name || <span className="text-muted-foreground italic">Not provided</span>}
                      </TableCell>
                      <TableCell>
                        {parent.student_name || <span className="text-muted-foreground italic">Not provided</span>}
                      </TableCell>
                      <TableCell>
                        {parent.class_year ? (
                          <Badge variant="outline">{parent.class_year}</Badge>
                        ) : (
                          <span className="text-muted-foreground italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {parent.region ? (
                          <Badge variant="secondary">{parent.region}</Badge>
                        ) : (
                          <span className="text-muted-foreground italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteParent(parent.id)}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentsManager;
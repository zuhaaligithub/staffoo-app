



import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { X, MapPin, ChevronDown } from 'lucide-react-native';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

type JobTypeKey = 'company' | 'contract' | 'freelance' | 'fullTime' | 'partTime';

type Props = { navigation: any };

export default function FilterScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState([0, 200000]);

  const [jobTypes, setJobTypes] = useState<Record<JobTypeKey, boolean>>({
    company: false,
    contract: false,
    freelance: false,
    fullTime: false,
    partTime: false,
  });

  const categories = [
    { label: 'Design', value: 'design' },
    { label: 'Development', value: 'dev' },
    { label: 'Marketing', value: 'marketing' },
    { label: 'Photography', value: 'photography' },
    { label: 'Writing', value: 'writing' },
    { label: 'Business', value: 'business' },
    { label: 'Finance', value: 'finance' },
  ];

  const jobTypeOptions: { key: JobTypeKey; label: string }[] = [
    { key: 'company', label: 'Company' },
    { key: 'contract', label: 'Contract Based' },
    { key: 'freelance', label: 'Freelance' },
    { key: 'fullTime', label: 'Full Time' },
    { key: 'partTime', label: 'Part Time' },
  ];

  const toggleJobType = (key: JobTypeKey) => {
    setJobTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applyFilters = () => {
    console.log({
      category: selectedCategory,
      location,
      salary: salaryRange,
      jobTypes: Object.keys(jobTypes).filter((k) => jobTypes[k as JobTypeKey]),
    });
    navigation.goBack();
  };

  const minSalary = salaryRange[0];
  const maxSalary = salaryRange[1];

  // Your exact bar heights from the HTML
  const barHeights = [
    84, 81, 100, 50, 61, 49, 71, 43, 41, 85,
    90, 77, 78, 90, 55, 93, 67, 50, 61, 98,
    82, 73, 78, 58, 58, 80, 83, 88, 95, 87,
  ];



  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={28} style={styles.backBox}  color="#121927" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Filters</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerWrapper}>
            <RNPickerSelect
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              items={categories}
              style={pickerSelectStyles}
              placeholder={{ label: 'Choose your category', value: null }}
              useNativeAndroidPickerStyle={false}
            />
            <ChevronDown
              size={20}
              color="#121927"
              style={styles.chevron}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputWrapper}>
            <MapPin size={18} color="#121927" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="Write your location"
              value={location}
              onChangeText={setLocation}
              placeholderTextColor="#999"
            />
          </View>
        </View>
           
        {/* Salary – corrected to match image exactly */}
        <View style={styles.field}>
          <View style={styles.salaryHeader}>
            <Text style={styles.label}>Min. Salary</Text>
            <Text style={styles.label}>Max. Salary</Text>
          </View>

          <View style={styles.salaryChartContainer}>
       
            {/* Background: light gray for inactive area + histogram bars */}
            <View style={styles.histogramWrapper}>
              {/* Inactive background (light gray fill like many designs) */}
              <View style={styles.inactiveTrackBackground} />
 
              <View style={styles.histogramBackground}>
                {barHeights.map((heightPercent, index) => {
                  const totalBars = barHeights.length;
                  const minIndex = Math.floor(
                    (salaryRange[0] / 200000) * totalBars
                  );
                  const maxIndex = Math.floor(
                    (salaryRange[1] / 200000) * totalBars
                  );

                  const isActive = index >= minIndex && index <= maxIndex;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.histogramBar,
                        {
                          height: `${Math.min(heightPercent * 0.6, 100)}%`,
                          backgroundColor: isActive ? '#7FA9FF' : '#E3E6ED',
                        },
                      ]}
                    />
                  );
                })}
              </View>


              {/* Values – clearly below the chart */}
              <View style={styles.salaryValues}>
                <Text>${Math.round(minSalary / 1000)}K</Text>
                <Text>${Math.round(maxSalary / 1000)}K</Text>
              </View>

    
            </View>
          </View>
        </View>
                   <MultiSlider
                values={salaryRange}
                onValuesChange={(values) => setSalaryRange(values)}
                min={0}
                max={200000}
                step={5000}
                sliderLength={SCREEN_WIDTH - 40}
                allowOverlap={false}
                customMarker={() => <View style={styles.sliderThumb} />}
                trackStyle={styles.sliderTrack}
                selectedStyle={styles.sliderSelected}
                unselectedStyle={styles.sliderUnselected}
                containerStyle={styles.sliderContainer}
                markerOffsetY={10}   // 👈 ADD THIS
              />
        {/* Job Type - Chips */}
        <View style={styles.field}>
          <Text style={styles.label}>Job Type</Text>
          <View style={styles.chipsContainer}>
            {jobTypeOptions.map((item) => {
              const isSelected = jobTypes[item.key];
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleJobType(item.key)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Apply Button */}
      <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
        <Text style={styles.applyButtonText}>Apply Filter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff',paddingTop:20  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121927',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  field: { marginBottom: 28 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121927',
    marginBottom: 8,
  },
  pickerWrapper: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  chevron: {
    position: 'absolute',
    right: 14,
    top: 14,
    pointerEvents: 'none',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#000',
  },


  sliderWrapper: {
    height: 60,                    // enough space for bars + thumbs
    justifyContent: 'flex-end',
    position: 'relative',
  },

  histogramContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',                // full container height
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  salaryChartContainer: {
    height: 60,                    // more realistic height
    position: 'relative',
    marginTop: 6,
    marginBottom: 16,
  },
  histogramWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#f8f9ff',    // very light background
  },
  inactiveTrackBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,                     // thin gray base line
    backgroundColor: '#e5e7ff',    // subtle gray like many designs
    borderRadius: 2,
  },
  histogramBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  histogramBar: {
    flex: 1,
    marginHorizontal: 0.6,
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 2,
    backgroundColor: '#E3E6ED',
  },

  sliderSelected: {
    height: 6,
    borderRadius: 2,
    backgroundColor: '#2869FE',
  },

  sliderUnselected: {
    backgroundColor: '#E3E6ED',
  },
  sliderThumb: {
    width: 22,
    height: 22,
    borderRadius: 9,
    backgroundColor: '#F5A623',
    borderWidth: 5,
    borderColor: '#ffffff',
  },
  salaryValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  salaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipSelected: {
    backgroundColor: '#2869FE',
    borderColor: '#2869FE',
  },
  chipText: {
    fontSize: 14,
    color: '#555',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  sliderContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
   backBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
    // subtle shadow for "box" feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  applyButton: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#2869FE',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: '#000', // always black when selected; placeholder handled below
    backgroundColor: 'transparent',
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: '#000',
    backgroundColor: 'transparent',
  },
  placeholder: {
    color: '#999', // gray for "Choose your category"
  },
};
